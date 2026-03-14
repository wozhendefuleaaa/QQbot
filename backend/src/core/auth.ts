import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, UserWithPassword, JwtPayload } from '../types.js';
import { id, nowIso } from './store.js';

const JWT_SECRET = process.env.JWT_SECRET || 'qqbot-jwt-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const SALT_ROUNDS = 10;

// 用户存储（内存中，生产环境应使用数据库）
export const users: UserWithPassword[] = [];

// 初始化默认管理员账户
export async function initializeDefaultAdmin() {
  const adminExists = users.find(u => u.username === 'admin');
  if (!adminExists) {
    const passwordHash = await hashPassword('admin123');
    const admin: UserWithPassword = {
      id: id('user'),
      username: 'admin',
      role: 'admin',
      passwordHash,
      createdAt: nowIso(),
      lastLoginAt: null
    };
    users.push(admin);
    console.log('[AUTH] 已创建默认管理员账户: admin / admin123');
  }
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
  return true;
}

/**
 * 转换为公开用户信息（不含密码）
 */
export function toPublicUser(user: UserWithPassword): User {
  const { passwordHash: _, ...rest } = user;
  return rest;
}
