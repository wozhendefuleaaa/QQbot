import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

interface RateLimitOptions {
  windowMs?: number; // 时间窗口（毫秒）
  max?: number; // 最大请求数
  message?: string; // 自定义错误消息
  keyGenerator?: (req: Request) => string; // 自定义键生成器
  skip?: (req: Request) => boolean; // 跳过限制的条件
}

/**
 * 内存速率限制中间件
 * 用于防止 API 滥用和 DDoS 攻击
 */
export function createRateLimiter(options: RateLimitOptions = {}) {
  const {
    windowMs = 60 * 1000, // 默认 1 分钟
    max = 100, // 默认每分钟 100 次请求
    message = '请求过于频繁，请稍后再试',
    keyGenerator = (req: Request) => req.ip || req.socket.remoteAddress || 'unknown',
    skip
  } = options;

  const store: RateLimitStore = {};

  // 定期清理过期记录
  setInterval(() => {
    const now = Date.now();
    for (const key of Object.keys(store)) {
      if (store[key].resetTime < now) {
        delete store[key];
      }
    }
  }, windowMs);

  return (req: Request, res: Response, next: NextFunction) => {
    // 跳过特定请求
    if (skip?.(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();

    // 初始化或重置过期记录
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs
      };
    }

    store[key].count++;

    // 设置速率限制头
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - store[key].count));
    res.setHeader('X-RateLimit-Reset', store[key].resetTime);

    if (store[key].count > max) {
      res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000)
      });
      return;
    }

    next();
  };
}

/**
 * 严格速率限制（用于敏感接口如登录）
 */
export function createStrictRateLimiter() {
  return createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 5, // 最多 5 次尝试
    message: '操作次数过多，请 15 分钟后再试'
  });
}

/**
 * API 通用速率限制
 */
export function createApiRateLimiter() {
  return createRateLimiter({
    windowMs: 60 * 1000, // 1 分钟
    max: 120, // 每分钟 120 次
    skip: (req: Request) => {
      // 健康检查接口跳过限制
      return req.path === '/health' || req.path === '/ready';
    }
  });
}

/**
 * SSE 连接速率限制（防止频繁重连）
 */
export function createSseRateLimiter() {
  return createRateLimiter({
    windowMs: 60 * 1000, // 1 分钟
    max: 10, // 每分钟最多 10 次连接
    keyGenerator: (req: Request) => `sse:${req.ip || req.socket.remoteAddress || 'unknown'}`,
    message: 'SSE 连接过于频繁，请稍后再试'
  });
}
