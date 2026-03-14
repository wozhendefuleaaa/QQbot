import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    
    // 确保原型链正确
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 400, true, code);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = '未授权访问') {
    super(message, 401, true, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = '禁止访问') {
    super(message, 403, true, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super(message, 404, true, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, true, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

/**
 * 异步路由处理器包装函数
 * 自动捕获异步错误并传递给错误处理中间件
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 全局错误处理中间件
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  // 如果是自定义错误
  if (err instanceof AppError) {
    const response: Record<string, unknown> = {
      error: err.name,
      message: err.message,
      statusCode: err.statusCode
    };

    if (err.code) {
      response.code = err.code;
    }

    // 开发环境下添加堆栈信息
    if (process.env.NODE_ENV === 'development') {
      response.stack = err.stack;
    }

    return res.status(err.statusCode).json(response);
  }

  // 处理 JSON 解析错误
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: 'SyntaxError',
      message: 'JSON 格式错误',
      statusCode: 400
    });
  }

  // 未知错误
  console.error('[Error] 未处理的错误:', err);
  
  const response: Record<string, unknown> = {
    error: 'InternalServerError',
    message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
    statusCode: 500
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  return res.status(500).json(response);
}

/**
 * 404 处理中间件
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'NotFound',
    message: `路由 ${req.method} ${req.path} 不存在`,
    statusCode: 404
  });
}
