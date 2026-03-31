import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, UserWithPassword, JwtPayload } from '../types.js';
import { id, nowIso } from './store.js';
import { readJsonFile, writeJsonFile } from './storage/base.js';
import { existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = process.env.DATA_DIR || './data';
const USERS_FILE = join(DATA_DIR, 'users.json');
const DEFAULT_JWT_SECRET = 'qqbot-jwt-secret-key-change-in-production';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const SALT_ROUNDS = 10;

// 默认管理员密码（首次登录需要修改）
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// 用户存储（内存中，定期持久化到磁盘）
export const users: UserWithPassword[] = [];

/**
 * 检查是否使用默认JWT密钥
 */
export function isUsingDefaultJwtSecret(): boolean {
  return JWT_SECRET === DEFAULT_JWT_SECRET;
}

/**
 * 获取JWT密钥状态信息
 */
export function getJwtSecretStatus(): { isDefault: boolean; warning?: string } {
  if (isUsingDefaultJwtSecret()) {
    return {
      isDefault: true,
      warning: '警告: 正在使用默认JWT密钥，生产环境请设置环境变量 JWT_SECRET'
    };
  }
  return { isDefault: false };
}

/**
 * 从磁盘加载用户数据
 */
export async function loadUsersFromDisk(): Promise<void> {
  try {
    const data = await readJsonFile<UserWithPassword[]>(USERS_FILE);
    if (data && Array.isArray(data)) {
      users.length = 0; // 清空现有数据
      users.push(...data);
      console.log(`[AUTH] 已从磁盘加载 ${users.length} 个用户`);
    }
  } catch (error) {
    console.error('[AUTH] 加载用户数据失败:', error);
  }
}

/**
 * 保存用户数据到磁盘
 */
export async function saveUsersToDisk(): Promise<void> {
  try {
    await writeJsonFile(USERS_FILE, users);
  } catch (error) {
    console.error('[AUTH] 保存用户数据失败:', error);
  }
}

// 初始化默认管理员账户
export async function initializeDefaultAdmin() {
  // 先从磁盘加载用户数据
  await loadUsersFromDisk();
  
  const adminExists = users.find(u => u.username === 'admin');
  if (!adminExists) {
    // 使用环境变量 ADMIN_PASSWORD 或默认密码 admin123
    // 首次登录后需要强制修改密码
    const password = DEFAULT_ADMIN_PASSWORD;
    
    const passwordHash = await hashPassword(password);
    const admin: UserWithPassword = {
      id: id('user'),
      username: 'admin',
      role: 'admin',
      passwordHash,
      createdAt: nowIso(),
      lastLoginAt: null,
      requirePasswordChange: true  // 标记需要修改密码
    };
    users.push(admin);
    await saveUsersToDisk();
    
    console.log('\n' + '='.repeat(60));
    console.log('[AUTH] 已创建默认管理员账户');
    console.log('[AUTH] 用户名: admin');
    console.log('[AUTH] 密码: admin123');
    console.log('[AUTH] 首次登录后请立即修改密码！');
    if (process.env.ADMIN_PASSWORD) {
      console.log('[AUTH] 注意: 已使用环境变量 ADMIN_PASSWORD 设置的密码');
    }
    console.log('='.repeat(60) + '\n');
  }
  
  // 检查JWT密钥安全性
  const jwtStatus = getJwtSecretStatus();
  if (jwtStatus.isDefault) {
    console.warn('\n' + '!'.repeat(60));
    console.warn(jwtStatus.warning);
    console.warn('!'.repeat(60) + '\n');
  }
}

/**
 * 检查是否使用默认密码
 */
export function isUsingDefaultPassword(password: string): boolean {
  return password === DEFAULT_ADMIN_PASSWORD;
}

/**
 * 清除用户的密码修改标记
 */
export function clearRequirePasswordChange(userId: string): void {
  const user = users.find(u => u.id === userId);
  if (user) {
    delete user.requirePasswordChange;
    saveUsersToDisk().catch(err => console.error('[AUTH] 保存用户数据失败:', err));
  }
}

/**
 * 生成随机密码
 */
function generateRandomPassword(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * 密码哈希
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 生成 JWT Token
 */
export function generateToken(user: User): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    userId: user.id,
    username: user.username,
    role: user.role
  };
  const expiresIn = getTokenExpiresIn();
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * 验证 JWT Token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * 从 Token 获取过期时间（秒）
 */
export function getTokenExpiresIn(): number {
  const expiresStr = JWT_EXPIRES_IN;
  const unit = expiresStr.slice(-1);
  const value = parseInt(expiresStr.slice(0, -1), 10);
  
  switch (unit) {
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    case 'm': return value * 60;
    case 's': return value;
    default: return 86400; // 默认 24 小时
  }
}

/**
 * 根据用户名查找用户
 */
export function findUserByUsername(username: string): UserWithPassword | undefined {
  return users.find(u => u.username === username);
}

/**
 * 根据 ID 查找用户
 */
export function findUserById(id: string): UserWithPassword | undefined {
  return users.find(u => u.id === id);
}

/**
 * 创建用户
 */
export async function createUser(username: string, password: string, role: 'admin' | 'user' = 'user'): Promise<User> {
  const existing = findUserByUsername(username);
  if (existing) {
    throw new Error('用户名已存在');
  }
  
  const passwordHash = await hashPassword(password);
  const user: UserWithPassword = {
    id: id('user'),
    username,
    role,
    passwordHash,
    createdAt: nowIso(),
    lastLoginAt: null
  };
  
  users.push(user);
  await saveUsersToDisk(); // 持久化用户数据
  
  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * 更新用户最后登录时间
 */
export function updateUserLastLogin(userId: string): void {
  const user = users.find(u => u.id === userId);
  if (user) {
    user.lastLoginAt = nowIso();
  }
}

/**
 * 修改密码
 */
export async function changePassword(userId: string, newPassword: string): Promise<boolean> {
  const user = users.find(u => u.id === userId);
  if (!user) {
    return false;
  }
  user.passwordHash = await hashPassword(newPassword);
  await saveUsersToDisk(); // 持久化用户数据
  return true;
}

/**
 * 转换为公开用户信息（不含密码）
 */
export function toPublicUser(user: UserWithPassword): User {
  const { passwordHash: _, ...rest } = user;
  return rest;
}
