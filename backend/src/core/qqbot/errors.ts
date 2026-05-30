/**
 * QQ 机器人官方 API 错误码映射与处理
 * 基于官方文档：https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/error-trace/openapi.html
 */

// ==================== 错误码常量 ====================
export const ErrorCode = {
  // ---- Token/认证错误 ----
  TOKEN_MISSING: 11241,
  TOKEN_CHECK_FAILED: 11242,
  TOKEN_CHECK_NOT_PASS: 11243,
  WRONG_APPID: 11251,
  APP_PRIVILEGE_FAILED: 11252,
  APP_PRIVILEGE_NOT_PASS: 11253,
  INTERFACE_FORBIDDEN: 11254,
  ROBOT_BANED: 11265,

  // ---- 消息发送错误 ----
  MSG_EMPTY: 50006,
  MSG_ID_MISSING: 50048,
  MSG_ID_EXPIRED: 304027,
  MSG_ID_WRONG: 304026,
  MSG_NOT_AT_BOT: 304028,
  MSG_URL_NOT_ALLOWED: 304003,
  MSG_ARK_NO_PERMISSION: 304004,
  MSG_EMBED_LIMIT: 304005,
  MSG_TEMPLATE_MISSING: 304011,
  MSG_TEMPLATE_PRIVILEGE: 304014,
  MSG_MARKDOWN_NO_PRIVILEGE: 304036,
  MSG_KEYBOARD_NO_PRIVILEGE: 304037,
  MSG_BEAT: 304025,
  MSG_SEND_ERROR: 304016,

  // ---- 频率限制 ----
  RATE_LIMIT: 429,
  CHANNEL_RATE_LIMIT: 20028,
  MSG_SEND_OVER_LIMIT: 22009,

  // ---- 撤回消息错误 ----
  RETRACT_PARAM_INVALID: 306001,
  RETRACT_MSGID_ERROR: 306002,
  RETRACT_NOT_PERMITTED: 306004,
  RETRACT_EXPIRED: 306011,
  RETRACT_INTERNAL_ERROR: 306010,

  // ---- 富媒体错误 ----
  MEDIA_FETCH_FAILED: 304082,
  MEDIA_CONVERT_FAILED: 304083,
  UPLOAD_IMAGE_ERROR: 304017,
  FILE_SIZE_EXCEEDED: 304020,

  // ---- 会话错误 ----
  SESSION_NOT_EXIST: 304018,
  PUSH_TIME_LIMIT: 304022,

  // ---- 安全打击 ----
  SAFETY_BEAT: 1100101,
  SAFETY_RATE_LIMIT: 1100100,
  SAFETY_GENERAL: 1100103,
  GROUP_INVALID: 1100104,
} as const;

// 错误码数组（用于 includes 检查）
const AUTH_ERROR_CODES = [ErrorCode.TOKEN_MISSING, ErrorCode.TOKEN_CHECK_NOT_PASS, ErrorCode.WRONG_APPID] as readonly number[];
const AUTH_RETRY_CODES = [ErrorCode.TOKEN_CHECK_FAILED] as readonly number[];
const RATE_LIMIT_CODES = [ErrorCode.RATE_LIMIT, ErrorCode.CHANNEL_RATE_LIMIT, ErrorCode.MSG_SEND_OVER_LIMIT] as readonly number[];
const MEDIA_ERROR_CODES = [ErrorCode.MEDIA_FETCH_FAILED, ErrorCode.MEDIA_CONVERT_FAILED] as readonly number[];
const RETRACT_RETRY_CODES = [ErrorCode.RETRACT_INTERNAL_ERROR, ErrorCode.RETRACT_MSGID_ERROR] as readonly number[];
const SAFETY_CODES = [ErrorCode.MSG_BEAT, ErrorCode.SAFETY_BEAT, ErrorCode.SAFETY_RATE_LIMIT, ErrorCode.SAFETY_GENERAL, ErrorCode.GROUP_INVALID] as readonly number[];

// ==================== 错误分类 ====================
export type ErrorCategory =
  | 'auth'
  | 'rate_limit'
  | 'message'
  | 'retract'
  | 'media'
  | 'session'
  | 'safety'
  | 'unknown';

export interface ParsedError {
  code: number;
  message: string;
  category: ErrorCategory;
  retryable: boolean;
  retryAfterMs?: number;
}

/**
 * 根据错误码分类并决定是否可重试
 */
export function parseApiError(
  statusCode: number,
  code?: number,
  detail?: string
): ParsedError {
  const msg = detail || `HTTP ${statusCode}`;

  // HTTP 状态码分类
  if (statusCode === 401) {
    return { code: code || 0, message: msg, category: 'auth', retryable: false };
  }
  if (statusCode === 429) {
    return {
      code: ErrorCode.RATE_LIMIT,
      message: msg,
      category: 'rate_limit',
      retryable: true,
      retryAfterMs: 2000,
    };
  }

  // 按业务错误码分类
  if (code === undefined) {
    return { code: 0, message: msg, category: 'unknown', retryable: statusCode >= 500 };
  }

  // Token/认证错误 — 不可重试，需要刷新 token
  if (AUTH_ERROR_CODES.includes(code)) {
    return {
      code,
      message: msg,
      category: 'auth',
      retryable: false,
    };
  }

  // Token 系统错误 — 可重试 1 次
  if (AUTH_RETRY_CODES.includes(code)) {
    return { code, message: msg, category: 'auth', retryable: true };
  }

  // 消息ID过期 — 不可重试但应自动回退
  if (code === ErrorCode.MSG_ID_EXPIRED) {
    return { code, message: msg, category: 'message', retryable: false };
  }

  // 频率限制 — 可重试
  if (RATE_LIMIT_CODES.includes(code)) {
    return { code, message: msg, category: 'rate_limit', retryable: true, retryAfterMs: 2000 };
  }

  // 富媒体错误 — 可重试
  if (MEDIA_ERROR_CODES.includes(code)) {
    return { code, message: msg, category: 'media', retryable: true, retryAfterMs: 1000 };
  }

  // 撤回内部错误 — 可重试
  if (RETRACT_RETRY_CODES.includes(code)) {
    return { code, message: msg, category: 'retract', retryable: true };
  }

  // 会话不存在 — 可重试
  if (code === ErrorCode.SESSION_NOT_EXIST) {
    return {
      code,
      message: msg,
      category: 'session',
      retryable: true,
      retryAfterMs: 1000,
    };
  }

  // 安全打击 — 不可重试
  if (SAFETY_CODES.includes(code)) {
    return { code, message: msg, category: 'safety', retryable: false };
  }

  // 默认：5xx 可重试，4xx 不可重试
  return {
    code,
    message: msg,
    category: 'unknown',
    retryable: statusCode >= 500,
  };
}

/**
 * 人类可读的错误描述
 */
export function getFriendlyErrorMessage(code: number): string {
  const map: Record<number, string> = {
    [ErrorCode.TOKEN_MISSING]: '鉴权 Token 缺失',
    [ErrorCode.TOKEN_CHECK_NOT_PASS]: 'Token 校验未通过，请检查 AppID 和 ClientSecret',
    [ErrorCode.WRONG_APPID]: 'AppID 不正确',
    [ErrorCode.ROBOT_BANED]: '机器人已被封禁',
    [ErrorCode.MSG_EMPTY]: '消息内容不能为空',
    [ErrorCode.MSG_ID_EXPIRED]: '回复消息已过期',
    [ErrorCode.MSG_ID_WRONG]: '回复的消息 ID 错误',
    [ErrorCode.MSG_NOT_AT_BOT]: '不允许回复非 @ 机器人的消息',
    [ErrorCode.MSG_URL_NOT_ALLOWED]: '消息内容包含未报备的 URL',
    [ErrorCode.MSG_ARK_NO_PERMISSION]: '无 Ark 消息发送权限',
    [ErrorCode.MSG_MARKDOWN_NO_PRIVILEGE]: '无 Markdown 消息权限',
    [ErrorCode.MSG_KEYBOARD_NO_PRIVILEGE]: '无键盘消息权限',
    [ErrorCode.MSG_BEAT]: '消息被安全打击',
    [ErrorCode.RATE_LIMIT]: '请求频率过高，请稍后重试',
    [ErrorCode.CHANNEL_RATE_LIMIT]: '子频道消息频率超限',
    [ErrorCode.MSG_SEND_OVER_LIMIT]: '消息发送超频',
    [ErrorCode.RETRACT_NOT_PERMITTED]: '无权撤回此消息',
    [ErrorCode.RETRACT_EXPIRED]: '消息已超过可撤回时间',
    [ErrorCode.MEDIA_FETCH_FAILED]: '富媒体资源拉取失败',
    [ErrorCode.MEDIA_CONVERT_FAILED]: '富媒体资源转换失败',
    [ErrorCode.UPLOAD_IMAGE_ERROR]: '图片上传失败',
    [ErrorCode.FILE_SIZE_EXCEEDED]: '文件大小超限',
    [ErrorCode.SESSION_NOT_EXIST]: '机器人未连接 Gateway',
    [ErrorCode.SAFETY_BEAT]: '内容涉及敏感信息',
    [ErrorCode.SAFETY_RATE_LIMIT]: '消息被限频',
    [ErrorCode.GROUP_INVALID]: '该群已失效或不存在',
  };
  return map[code] || `未知错误 (${code})`;
}
