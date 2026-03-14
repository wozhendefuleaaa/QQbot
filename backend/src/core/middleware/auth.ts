import { Request, Response, NextFunction } from 'express';
import { verifyToken, findUserById, toPublicUser } from '../auth.js';
import { JwtPayload, User } from '../../types.js';
import { UnauthorizedError } from './error-handler.js';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: User;
      jwtPayload?: JwtPayload;
    }
  }
}

/**
 * 认证中间件 - 验证 JWT Token
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('缺少认证令牌'));
  }
  
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  
  if (!payload) {
    return next(new UnauthorizedError('无效或过期的令牌'));
  }
  
  const user = findUserById(payload.userId);
  if (!user) {
    return next(new UnauthorizedError('用户不存在'));
  }
  
  req.user = toPublicUser(user);
  req.jwtPayload = payload;
  next();
}

/**
 * 可选认证中间件 - 如果提供 token 则验证，否则继续
 */
export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  
  if (payload) {
    const user = findUserById(payload.userId);
    if (user) {
      req.user = toPublicUser(user);
      req.jwtPayload = payload;
    }
  }
  
  next();
}

/**
 * 角色检查中间件工厂
 */
export function requireRole(...roles: Array<'admin' | 'user'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('需要认证'));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new UnauthorizedError('权限不足'));
    }
    
    next();
  };
}

/**
 * 管理员权限中间件
 */
export const requireAdmin = requireRole('admin');
