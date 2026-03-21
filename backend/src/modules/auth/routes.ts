import { Router } from 'express';
import { asyncHandler } from '../../core/middleware/error-handler.js';
import { authMiddleware } from '../../core/middleware/auth.js';
import {
  findUserByUsername,
  verifyPassword,
  generateToken,
  toPublicUser,
  updateUserLastLogin,
  getTokenExpiresIn,
  createUser,
  changePassword,
  users,
  isUsingDefaultPassword,
  clearRequirePasswordChange
} from '../../core/auth.js';
import { LoginRequest, LoginResponse, AuthStatus, User } from '../../types.js';

const router = Router();

/**
 * 登录
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body as LoginRequest;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: '用户名和密码不能为空'
    });
  }
  
  const user = findUserByUsername(username);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: '用户名或密码错误'
    });
  }
  
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({
      success: false,
      error: '用户名或密码错误'
    });
  }
  
  // 检查是否需要强制修改密码（使用默认密码或已标记）
  const requirePasswordChange = user.requirePasswordChange === true || isUsingDefaultPassword(password);
  
  // 更新最后登录时间
  updateUserLastLogin(user.id);
  
  // 生成 token
  const publicUser = toPublicUser(user);
  // 如果需要修改密码，在用户信息中标记
  if (requirePasswordChange) {
    publicUser.requirePasswordChange = true;
  }
  const token = generateToken(publicUser);
  
  const response: LoginResponse = {
    success: true,
    user: publicUser,
    token,
    expiresIn: getTokenExpiresIn()
  };
  
  res.json(response);
}));

/**
 * 登出（客户端清除 token 即可）
 */
router.post('/logout', (_req, res) => {
  res.json({ success: true, message: '已登出' });
});

/**
 * 验证 token / 获取当前用户信息
 */
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    authenticated: true,
    user: req.user
  } as AuthStatus);
});

/**
 * 检查认证状态（公开端点）
 */
router.get('/status', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ authenticated: false } as AuthStatus);
  }
  
  // 这里不强制验证，只是检查
  res.json({ authenticated: true } as AuthStatus);
});

/**
 * 修改密码
 */
router.post('/change-password', authMiddleware, asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  const user = users.find(u => u.id === req.user!.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: '用户不存在'
    });
  }
  
  // 如果用户需要强制修改密码，则不需要验证旧密码
  const requirePasswordChange = user.requirePasswordChange === true;
  
  if (!requirePasswordChange && !oldPassword) {
    return res.status(400).json({
      success: false,
      error: '旧密码不能为空'
    });
  }
  
  if (!newPassword) {
    return res.status(400).json({
      success: false,
      error: '新密码不能为空'
    });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: '新密码长度至少6位'
    });
  }
  
  // 非强制修改密码的情况，需要验证旧密码
  if (!requirePasswordChange && oldPassword) {
    const isValid = await verifyPassword(oldPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: '旧密码错误'
      });
    }
  }
  
  await changePassword(user.id, newPassword);
  
  // 清除密码修改标记
  clearRequirePasswordChange(user.id);
  
  res.json({
    success: true,
    message: '密码修改成功'
  });
}));

/**
 * 创建新用户（仅管理员）
 */
router.post('/users', authMiddleware, asyncHandler(async (req, res) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '权限不足'
    });
  }
  
  const { username, password, role } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: '用户名和密码不能为空'
    });
  }
  
  try {
    const newUser = await createUser(username, password, role || 'user');
    res.status(201).json({
      success: true,
      user: newUser
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message
    });
  }
}));

/**
 * 获取用户列表（仅管理员）
 */
router.get('/users', authMiddleware, (req, res) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '权限不足'
    });
  }
  
  const userList: User[] = users.map(u => toPublicUser(u));
  res.json({
    success: true,
    items: userList
  });
});

export function registerAuthRoutes(app: import('express').Express) {
  app.use('/api/auth', router);
}