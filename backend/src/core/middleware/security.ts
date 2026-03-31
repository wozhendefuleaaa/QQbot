import { Request, Response, NextFunction } from 'express';

/**
 * 安全中间件 - 设置安全相关的HTTP头
 */
export function securityMiddleware(req: Request, res: Response, next: NextFunction) {
  // 防止XSS攻击 - 设置Content-Security-Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self';");

  // 防止点击劫持 - 设置X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');

  // 防止MIME类型嗅探 - 设置X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 启用严格传输安全 - 设置Strict-Transport-Security
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // 防止XSS攻击 - 设置X-XSS-Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // 控制Referer策略
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 控制Cross-Origin-Embedder-Policy
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  // 控制Cross-Origin-Opener-Policy
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  // 控制Cross-Origin-Resource-Policy
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  next();
}

/**
 * HTTPS重定向中间件 - 在生产环境中强制使用HTTPS
 */
export function httpsRedirectMiddleware(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
}

/**
 * 输入清理函数 - 防止XSS攻击
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input;
  
  const sanitizers: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;'
  };
  
  return input.replace(/[&<>"'\/]/g, (char) => sanitizers[char]);
}

/**
 * 批量清理对象中的输入
 */
export function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}
