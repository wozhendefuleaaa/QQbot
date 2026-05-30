/**
 * QQ 机器人消息发送模块
 * 
 * 支持文本、Markdown、Ark、Embed、键盘消息及图片上传发送
 * 基于官方文档：发送消息 API v2
 */

import { authHeaders, fetchAccessToken, QQ_GATEWAY_API_BASE, withAuthRetry } from './auth.js';
import { parseApiError } from './errors.js';
import type {
  BotCredentials,
  SendMessageRequest,
  SendMessageResponse,
  ArkPayload,
  EmbedPayload,
  KeyboardPayload,
  MarkdownPayload,
} from './types.js';
import { MessageType } from './types.js';

// ==================== 内部工具 ====================

/** API 基地址 (去除末尾斜杠) */
const BASE = QQ_GATEWAY_API_BASE.replace(/\/$/, '');

/** 消息发送场景 → URL 路径 */
function getSendPath(
  targetId: string,
  targetType: 'user' | 'group' | 'channel' | 'dm'
): string {
  switch (targetType) {
    case 'group':
      return `/v2/groups/${encodeURIComponent(targetId)}/messages`;
    case 'channel':
      return `/channels/${encodeURIComponent(targetId)}/messages`;
    case 'dm':
      return `/dms/${encodeURIComponent(targetId)}/messages`;
    default:
      return `/v2/users/${encodeURIComponent(targetId)}/messages`;
  }
}

/** 发送通用请求 */
async function sendRequest(
  credentials: BotCredentials,
  targetId: string,
  targetType: 'user' | 'group' | 'channel' | 'dm',
  payload: SendMessageRequest
): Promise<SendMessageResponse> {
  const token = await fetchAccessToken(credentials);
  const url = `${BASE}${getSendPath(targetId, targetType)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeaders(credentials, token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    return (await res.json()) as SendMessageResponse;
  }

  const detail = await res.text().catch(() => '');
  let code: number | undefined;
  try {
    code = JSON.parse(detail)?.code;
  } catch {}

  const parsed = parseApiError(res.status, code, detail);

  // msg_id 过期时标记以便调用方重试
  if (parsed.code === 304027) {
    throw Object.assign(new Error('msg_id 已过期'), {
      code: 304027,
      msgIdExpired: true,
    });
  }

  throw Object.assign(
    new Error(`消息发送失败 [${parsed.category}]: ${parsed.message}`),
    { code: parsed.code, retryable: parsed.retryable, category: parsed.category }
  );
}

// ==================== 公开 API ====================

/**
 * 发送文本消息
 * 
 * @param credentials 机器人凭证
 * @param targetId 目标 openid / group_openid
 * @param text 文本内容 (群聊必填，单聊可选)
 * @param msgId 被动回复的消息 ID (可选)
 * @param targetType 会话类型
 * @returns 消息发送结果
 */
export async function sendTextMessage(
  credentials: BotCredentials,
  targetId: string,
  text: string,
  msgId?: string,
  targetType: 'user' | 'group' | 'channel' | 'dm' = 'user'
): Promise<SendMessageResponse> {
  const payload: SendMessageRequest = {
    msg_type: MessageType.TEXT,
    content: text,
  };
  if (msgId) {
    payload.msg_id = msgId;
    payload.msg_seq = 1;
  }
  return sendRequest(credentials, targetId, targetType, payload);
}

/**
 * 发送 Markdown 消息
 * 
 * 支持自定义模板和原生内容两种方式，
 * 需要先在开放平台配置模板或开通权限
 */
export async function sendMarkdownMessage(
  credentials: BotCredentials,
  targetId: string,
  markdown: MarkdownPayload,
  msgId?: string,
  targetType: 'user' | 'group' | 'channel' | 'dm' = 'user'
): Promise<SendMessageResponse> {
  const payload: SendMessageRequest = {
    msg_type: MessageType.MARKDOWN,
    markdown,
  };
  if (msgId) {
    payload.msg_id = msgId;
    payload.msg_seq = 1;
  }
  return sendRequest(credentials, targetId, targetType, payload);
}

/**
 * 发送 Ark 消息
 * 
 * 使用模板 ID 和 KV 参数发送结构化卡片消息，
 * 需要先获得模板 ID 并开通权限
 */
export async function sendArkMessage(
  credentials: BotCredentials,
  targetId: string,
  ark: ArkPayload,
  msgId?: string,
  targetType: 'user' | 'group' | 'channel' | 'dm' = 'user'
): Promise<SendMessageResponse> {
  const payload: SendMessageRequest = {
    msg_type: MessageType.ARK,
    ark,
  };
  if (msgId) {
    payload.msg_id = msgId;
    payload.msg_seq = 1;
  }
  return sendRequest(credentials, targetId, targetType, payload);
}

/**
 * 发送 Embed 消息 (仅单聊/群聊支持)
 */
export async function sendEmbedMessage(
  credentials: BotCredentials,
  targetId: string,
  embed: EmbedPayload,
  msgId?: string,
  targetType: 'user' | 'group' = 'user'
): Promise<SendMessageResponse> {
  const payload: SendMessageRequest = {
    msg_type: MessageType.EMBED,
    embed,
  };
  if (msgId) {
    payload.msg_id = msgId;
    payload.msg_seq = 1;
  }
  return sendRequest(credentials, targetId, targetType, payload);
}

/**
 * 发送键盘消息 (可与文本或 Markdown 组合)
 * 
 * @param content 可选的文本内容（有文本时 msg_type=0 + keyboard 字段，无文本时 msg_type=5）
 * @param keyboard 键盘定义
 */
export async function sendKeyboardMessage(
  credentials: BotCredentials,
  targetId: string,
  keyboard: KeyboardPayload,
  content?: string,
  msgId?: string,
  targetType: 'user' | 'group' | 'channel' | 'dm' = 'user'
): Promise<SendMessageResponse> {
  const payload: SendMessageRequest = {
    msg_type: content ? MessageType.TEXT : MessageType.KEYBOARD,
    content: content || '',
    keyboard,
  };
  if (msgId) {
    payload.msg_id = msgId;
    payload.msg_seq = 1;
  }
  return sendRequest(credentials, targetId, targetType, payload);
}

/**
 * 发送 Markdown + 键盘组合消息
 * 
 * 官方支持 Markdown（msg_type=2）与 keyboard 组合发送
 */
export async function sendMarkdownWithKeyboard(
  credentials: BotCredentials,
  targetId: string,
  markdown: MarkdownPayload,
  keyboard: KeyboardPayload,
  msgId?: string,
  targetType: 'user' | 'group' | 'channel' | 'dm' = 'user'
): Promise<SendMessageResponse> {
  const payload: SendMessageRequest = {
    msg_type: MessageType.MARKDOWN,
    markdown,
    keyboard,
  };
  if (msgId) {
    payload.msg_id = msgId;
    payload.msg_seq = 1;
  }
  return sendRequest(credentials, targetId, targetType, payload);
}

/**
 * 发送富媒体消息（图片）
 * 
 * @param fileInfo 由 uploadMedia 返回的 file_info 字符串
 */
export async function sendMediaMessage(
  credentials: BotCredentials,
  targetId: string,
  fileInfo: string,
  targetType: 'user' | 'group' = 'user'
): Promise<SendMessageResponse> {
  const payload: SendMessageRequest = {
    msg_type: MessageType.MEDIA,
    media: { file_info: fileInfo },
  };
  return sendRequest(credentials, targetId, targetType, payload);
}

/**
 * 上传富媒体文件（图片）
 * 
 * POST /v2/groups/{group_openid}/files (群聊)
 * POST /v2/users/{openid}/files (单聊)
 * 
 * @param fileBuffer 文件 Buffer
 * @param fileName 文件名
 * @returns file_info 字符串，用于 sendMediaMessage
 */
export async function uploadMedia(
  credentials: BotCredentials,
  targetId: string,
  fileBuffer: Buffer,
  fileName: string,
  targetType: 'user' | 'group' = 'user'
): Promise<string> {
  const token = await fetchAccessToken(credentials);
  const path =
    targetType === 'group'
      ? `/v2/groups/${encodeURIComponent(targetId)}/files`
      : `/v2/users/${encodeURIComponent(targetId)}/files`;
  const url = `${BASE}${path}`;

  // 构建 multipart/form-data
  const boundary = `----FormBoundary${Date.now()}`;
  const header = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
    'Content-Type: image/png',
    '',
    '',
  ].join('\r\n');
  const footer = `\r\n--${boundary}--\r\n`;

  const body = Buffer.concat([
    Buffer.from(header, 'utf-8'),
    fileBuffer,
    Buffer.from(footer, 'utf-8'),
  ]);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeaders(credentials, token),
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (res.ok) {
    const data = (await res.json()) as { file_info?: string };
    if (!data.file_info) throw new Error('上传响应缺少 file_info');
    return data.file_info;
  }

  const detail = await res.text().catch(() => '');
  throw new Error(`文件上传失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
}

/**
 * 撤回消息
 * 
 * DELETE /v2/groups/{group_openid}/messages/{message_id} (群聊)
 * DELETE /v2/users/{openid}/messages/{message_id} (单聊)
 * 
 * @param messageId 平台返回的消息 ID (非本地 ID)
 */
export async function recallMessage(
  credentials: BotCredentials,
  targetId: string,
  messageId: string,
  targetType: 'user' | 'group' = 'user'
): Promise<boolean> {
  const token = await fetchAccessToken(credentials);
  const path =
    targetType === 'group'
      ? `/v2/groups/${encodeURIComponent(targetId)}/messages/${encodeURIComponent(messageId)}`
      : `/v2/users/${encodeURIComponent(targetId)}/messages/${encodeURIComponent(messageId)}`;
  const url = `${BASE}${path}`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: authHeaders(credentials, token),
  });

  if (res.ok) return true;

  const detail = await res.text().catch(() => '');
  let code: number | undefined;
  try {
    code = JSON.parse(detail)?.code;
  } catch {}

  // 可重试的错误
  if (code === 306003 || code === 306005 || code === 306010) {
    throw Object.assign(new Error(`撤回消息失败 [${code}]: ${detail.slice(0, 200)}`), {
      code,
      retryable: true,
    });
  }

  // 不可重试的错误
  if (code === 306004 || code === 306011) {
    console.warn(`[QQBot] 消息撤回不可用: code=${code}`);
    return false;
  }

  return false;
}

/**
 * 发送消息（自动处理 msg_id 过期重试）
 * 
 * 先尝试带 msg_id 的被动回复，失败后自动降级为主动消息
 */
export async function sendMessageWithFallback(
  credentials: BotCredentials,
  targetId: string,
  targetType: 'user' | 'group',
  text: string,
  msgId?: string
): Promise<SendMessageResponse> {
  // 只有有效的 msgId 才尝试被动回复
  if (msgId) {
    try {
      return await sendTextMessage(credentials, targetId, text, msgId, targetType);
    } catch (error: any) {
      if (!error?.msgIdExpired) throw error;
      // msg_id 过期，回退为主动消息
    }
  }
  return sendTextMessage(credentials, targetId, text, undefined, targetType);
}

// 重新导出类型供外部使用
export { MessageType } from './types.js';
