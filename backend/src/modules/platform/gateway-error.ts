import { addPlatformLog } from '../../core/store.js';

// 错误类型枚举
export const ERROR_TYPE = {
  NETWORK: 'network',
  RATE_LIMIT: 'rate_limit',
  AUTH: 'auth',
  PARAMETER: 'parameter',
  PERMISSION: 'permission',
  NOT_FOUND: 'not_found',
  SERVER: 'server',
  UNKNOWN: 'unknown',
} as const;

// 错误接口
export interface GatewayError {
  type: keyof typeof ERROR_TYPE;
  message: string;
  code?: string;
  originalError?: any;
}

// 重试选项接口
export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrorTypes: Array<keyof typeof ERROR_TYPE>;
}

// 默认重试选项
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 500,
  maxDelay: 5000,
  backoffFactor: 2,
  retryableErrorTypes: ['network', 'rate_limit', 'server'],
};

/**
 * 解析错误类型
 */
export function parseErrorType(error: any): keyof typeof ERROR_TYPE {
  if (!error) {
    return ERROR_TYPE.UNKNOWN;
  }

  const errorMessage = error.message || String(error);
  const errorCode = error.code || '';

  // 网络错误
  if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('fetch')) {
    return ERROR_TYPE.NETWORK;
  }

  // 频率限制错误
  if (errorMessage.includes('exceed limit') || errorMessage.includes('22007')) {
    return ERROR_TYPE.RATE_LIMIT;
  }

  // 认证错误
  if (errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('token')) {
    return ERROR_TYPE.AUTH;
  }

  // 参数错误
  if (errorMessage.includes('400') || errorMessage.includes('parameter') || errorMessage.includes('invalid')) {
    return ERROR_TYPE.PARAMETER;
  }

  // 权限错误
  if (errorMessage.includes('403') || errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
    return ERROR_TYPE.PERMISSION;
  }

  // 资源不存在错误
  if (errorMessage.includes('404') || errorMessage.includes('not found')) {
    return ERROR_TYPE.NOT_FOUND;
  }

  // 服务器错误
  if (errorMessage.includes('500') || errorMessage.includes('server') || errorMessage.includes('internal error')) {
    return ERROR_TYPE.SERVER;
  }

  return ERROR_TYPE.UNKNOWN;
}

/**
 * 创建网关错误对象
 */
export function createGatewayError(error: any, customMessage?: string): GatewayError {
  const type = parseErrorType(error);
  const message = customMessage || (error.message || String(error));
  const code = error.code || undefined;

  return {
    type,
    message,
    code,
    originalError: error,
  };
}

/**
 * 重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const mergedOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= mergedOptions.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(
          mergedOptions.baseDelay * Math.pow(mergedOptions.backoffFactor, attempt - 1),
          mergedOptions.maxDelay
        );
        addPlatformLog('INFO', `重试中 (${attempt}/${mergedOptions.maxRetries})，等待 ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      return await fn();
    } catch (error) {
      lastError = error;
      const errorType = parseErrorType(error);

      if (attempt >= mergedOptions.maxRetries || !mergedOptions.retryableErrorTypes.includes(errorType)) {
        throw createGatewayError(error);
      }

      addPlatformLog('WARN', `尝试 ${attempt + 1} 失败: ${errorType} - ${error.message}`);
    }
  }

  throw lastError;
}

/**
 * 处理API响应错误
 */
export async function handleApiResponse<T>(response: Response, operation: string): Promise<T> {
  if (response.ok) {
    return await response.json() as T;
  }

  const detail = await response.text().catch(() => '');
  const errorMessage = `API ${operation} 失败: HTTP ${response.status} ${detail.slice(0, 300)}`;
  
  const error: any = new Error(errorMessage);
  error.status = response.status;
  error.detail = detail;
  
  throw createGatewayError(error);
}

/**
 * 安全的API调用包装器
 */
export async function safeApiCall<T>(
  fn: () => Promise<T>,
  operation: string,
  retryOptions?: Partial<RetryOptions>
): Promise<T> {
  try {
    return await retry(fn, retryOptions);
  } catch (error) {
    const gatewayError = createGatewayError(error);
    addPlatformLog('ERROR', `API ${operation} 失败: ${gatewayError.type} - ${gatewayError.message}`);
    throw gatewayError;
  }
}
