import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './error-handler.js';

type ValidationRule = {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: (string | number)[];
  custom?: (value: unknown) => boolean | string;
};

type ValidationSchema = {
  [key: string]: ValidationRule;
};

/**
 * 验证单个值
 */
function validateValue(value: unknown, rule: ValidationRule, fieldName: string): string | null {
  // 必填检查
  if (rule.required && (value === undefined || value === null || value === '')) {
    return `${fieldName} 是必填字段`;
  }

  // 如果值不存在且非必填，跳过其他验证
  if (value === undefined || value === null || value === '') {
    return null;
  }

  // 类型检查
  if (rule.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rule.type) {
      return `${fieldName} 类型错误，期望 ${rule.type}，实际 ${actualType}`;
    }
  }

  // 字符串长度检查
  if (typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return `${fieldName} 长度不能少于 ${rule.minLength} 个字符`;
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      return `${fieldName} 长度不能超过 ${rule.maxLength} 个字符`;
    }
    if (rule.pattern && !rule.pattern.test(value)) {
      return `${fieldName} 格式不正确`;
    }
  }

  // 数值范围检查
  if (typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      return `${fieldName} 不能小于 ${rule.min}`;
    }
    if (rule.max !== undefined && value > rule.max) {
      return `${fieldName} 不能大于 ${rule.max}`;
    }
  }

  // 数组长度检查
  if (Array.isArray(value)) {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return `${fieldName} 至少需要 ${rule.minLength} 个元素`;
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      return `${fieldName} 最多只能有 ${rule.maxLength} 个元素`;
    }
  }

  // 枚举值检查
  if (rule.enum && !rule.enum.includes(value as string | number)) {
    return `${fieldName} 必须是以下值之一: ${rule.enum.join(', ')}`;
  }

  // 自定义验证
  if (rule.custom) {
    const result = rule.custom(value);
    if (result !== true) {
      return typeof result === 'string' ? result : `${fieldName} 验证失败`;
    }
  }

  return null;
}

/**
 * 创建请求体验证中间件
 */
export function validateBody(schema: ValidationSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors: string[] = [];
    const body = req.body || {};

    for (const [fieldName, rule] of Object.entries(schema)) {
      const value = body[fieldName];
      const error = validateValue(value, rule, fieldName);
      if (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      return next(new ValidationError(errors.join('; ')));
    }

    next();
  };
}

/**
 * 创建查询参数验证中间件
 */
export function validateQuery(schema: ValidationSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors: string[] = [];
    const query = req.query || {};

    for (const [fieldName, rule] of Object.entries(schema)) {
      let value: unknown = query[fieldName];
      
      // 类型转换
      if (rule.type === 'number' && typeof value === 'string') {
        const num = Number(value);
        if (!isNaN(num)) {
          value = num;
        }
      }
      if (rule.type === 'boolean' && typeof value === 'string') {
        value = value === 'true' || value === '1';
      }

      const error = validateValue(value, rule, fieldName);
      if (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      return next(new ValidationError(errors.join('; ')));
    }

    next();
  };
}

/**
 * 创建路径参数验证中间件
 */
export function validateParams(schema: ValidationSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors: string[] = [];
    const params = req.params || {};

    for (const [fieldName, rule] of Object.entries(schema)) {
      let value: unknown = params[fieldName];
      
      // 类型转换
      if (rule.type === 'number' && typeof value === 'string') {
        const num = Number(value);
        if (!isNaN(num)) {
          value = num;
        }
      }

      const error = validateValue(value, rule, fieldName);
      if (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      return next(new ValidationError(errors.join('; ')));
    }

    next();
  };
}

/**
 * 常用验证规则
 */
export const commonRules = {
  id: {
    required: true,
    type: 'string' as const,
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9_-]+$/
  },
  accountId: {
    required: true,
    type: 'string' as const,
    minLength: 1,
    maxLength: 100
  },
  text: {
    type: 'string' as const,
    maxLength: 5000
  },
  name: {
    required: true,
    type: 'string' as const,
    minLength: 1,
    maxLength: 100
  },
  appId: {
    required: true,
    type: 'string' as const,
    minLength: 1,
    maxLength: 100
  },
  appSecret: {
    required: true,
    type: 'string' as const,
    minLength: 10,
    maxLength: 200
  },
  targetType: {
    required: true,
    type: 'string' as const,
    enum: ['user', 'group'] as string[]
  },
  limit: {
    type: 'number' as const,
    min: 1,
    max: 100
  }
};
