import { ParsedInboundEvent } from './gateway-types.js';

// 重新导出类型
export type { ParsedInboundEvent } from './gateway-types.js';

// Gateway 消息载荷类型
export type GatewayPayload = {
  op?: number;
  s?: number;
  t?: string;
  id?: string;
  d?: unknown;
};

// Gateway Hello 数据类型
export type GatewayHelloData = {
  heartbeat_interval?: number;
};

// Gateway 操作码
export const OP_RECONNECT = 7;
export const OP_INVALID_SESSION = 9;
export const OP_HELLO = 10;
export const OP_HEARTBEAT_ACK = 11;

// 默认 Intents
export const DEFAULT_INTENTS = (1 << 0) | (1 << 10) | (1 << 12) | (1 << 25) | (1 << 26) | (1 << 27);

// 表情匹配模式
export const FACE_PATTERN = /<faceType=\d+,faceId="[^"]+",ext="[^"]+">/g;

/**
 * 清理入站消息内容
 */
export function sanitizeInboundContent(input: unknown): string {
  if (input === null || input === undefined) return '';
  const text = String(input)
    .replace(/^\/+/, '')
    .replace(FACE_PATTERN, '')
    .replace(/^<@!?\w+>\s*/g, '')
    .trim();
  return text;
}

/**
 * 从对象中读取嵌套路径的值
 */
export function readPath(source: unknown, path: string): unknown {
  return path.split('/').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), source);
}

/**
 * 返回第一个非空字符串
 */
export function firstNonEmptyString(...candidates: unknown[]): string | null {
  for (const x of candidates) {
    if (typeof x === 'string' && x.trim()) return x.trim();
  }
  return null;
}

/**
 * 从附件中提取图片并追加到内容
 */
export function appendImageFromAttachments(content: string, attachments: unknown): string {
  if (!Array.isArray(attachments)) return content;
  for (const att of attachments) {
    const item = att as Record<string, unknown>;
    const contentType = String(item?.content_type || '');
    if (contentType.startsWith('image/')) {
      const url = firstNonEmptyString(item?.url, item?.proxy_url);
      if (!url) return content;
      const imageToken = `<${url}>`;
      return content ? `${content}${imageToken}` : imageToken;
    }
  }
  return content;
}

/**
 * 安全地截取载荷片段用于日志
 */
export function safePayloadSnippet(payload: unknown, maxLength = 600): string {
  try {
    const text = JSON.stringify(payload);
    if (!text) return '';
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  } catch {
    return '[unserializable-payload]';
  }
}

/**
 * 解析入站事件
 */
export function parseInboundEvent(payload: GatewayPayload): ParsedInboundEvent | null {
  const eventType = payload.t || '';
  const d = (payload.d || {}) as Record<string, unknown>;
  const baseInboundMsgId = firstNonEmptyString(d?.id as unknown, payload.id);

  if (eventType === 'GROUP_AT_MESSAGE_CREATE') {
    const groupId = firstNonEmptyString(d?.group_openid as unknown, d?.group_id as unknown);
    if (!groupId) return null;

    const raw = firstNonEmptyString(d?.content as unknown, (d?.message as Record<string, unknown>)?.content as unknown, (d?.data as Record<string, unknown>)?.content as unknown, (d?.raw_message as Record<string, unknown>)?.content as unknown);
    const sanitized = sanitizeInboundContent(raw);
    const withImage = appendImageFromAttachments(sanitized, d?.attachments as unknown);

    const peerName =
      firstNonEmptyString((d?.author as Record<string, unknown>)?.member_openid as unknown, (d?.author as Record<string, unknown>)?.username as unknown, (d?.author as Record<string, unknown>)?.id as unknown) || `群聊 ${groupId}`;

    return {
      shouldRecord: true,
      peerType: 'group',
      peerId: groupId,
      peerOpenId: firstNonEmptyString(d?.group_openid as unknown, d?.group_id as unknown),
      peerName,
      content: withImage || '[非文本消息]',
      inboundMsgId: baseInboundMsgId
    };
  }

  if (eventType === 'C2C_MESSAGE_CREATE') {
    const userId = firstNonEmptyString(
      (d?.author as Record<string, unknown>)?.member_openid as unknown,
      (d?.author as Record<string, unknown>)?.user_openid as unknown,
      d?.user_openid as unknown,
      (d?.author as Record<string, unknown>)?.id as unknown,
      d?.id as unknown
    );
    if (!userId) return null;

    const raw = firstNonEmptyString(d?.content as unknown, (d?.message as Record<string, unknown>)?.content as unknown, (d?.data as Record<string, unknown>)?.content as unknown, (d?.raw_message as Record<string, unknown>)?.content as unknown);
    const sanitized = sanitizeInboundContent(raw);
    const withImage = appendImageFromAttachments(sanitized, d?.attachments as unknown);

    const peerName = firstNonEmptyString((d?.author as Record<string, unknown>)?.username as unknown, (d?.author as Record<string, unknown>)?.id as unknown, (d?.author as Record<string, unknown>)?.member_openid as unknown) || `用户 ${userId}`;

    return {
      shouldRecord: true,
      peerType: 'user',
      peerId: userId,
      peerOpenId: firstNonEmptyString((d?.author as Record<string, unknown>)?.user_openid as unknown, d?.user_openid as unknown),
      peerName,
      content: withImage || '[非文本消息]',
      inboundMsgId: baseInboundMsgId
    };
  }

  if (eventType === 'INTERACTION_CREATE') {
    if (Number(readPath(payload, 'd/type')) === 13) {
      return null;
    }

    const chatType = Number(readPath(payload, 'd/chat_type'));
    const scene = String(readPath(payload, 'd/scene') || '');
    const isGroup = chatType === 1 || scene === 'group';

    const groupId = firstNonEmptyString(readPath(payload, 'd/group_openid') as unknown, readPath(payload, 'd/group_id') as unknown);
    const userId = firstNonEmptyString(
      readPath(payload, 'd/group_member_openid') as unknown,
      readPath(payload, 'd/user_openid') as unknown,
      readPath(payload, 'd/author/id') as unknown
    );

    const peerId = isGroup ? groupId : userId;
    if (!peerId) return null;

    const content = sanitizeInboundContent(readPath(payload, 'd/data/resolved/button_data')) || '[交互事件]';

    return {
      shouldRecord: true,
      peerType: isGroup ? 'group' : 'user',
      peerId,
      peerOpenId: firstNonEmptyString(groupId, userId),
      peerName: isGroup ? `群聊 ${peerId}` : `用户 ${peerId}`,
      content,
      inboundMsgId: firstNonEmptyString(payload.id)
    };
  }

  if (eventType.includes('MESSAGE')) {
    const groupId = firstNonEmptyString(d?.group_openid as unknown, d?.group_id as unknown, d?.channel_id as unknown);
    const userId = firstNonEmptyString((d?.author as Record<string, unknown>)?.member_openid as unknown, (d?.author as Record<string, unknown>)?.user_openid as unknown, d?.user_openid as unknown, (d?.author as Record<string, unknown>)?.id as unknown);
    const peerId = groupId || userId;
    if (!peerId) return null;

    const raw = firstNonEmptyString(d?.content as unknown, (d?.message as Record<string, unknown>)?.content as unknown, (d?.data as Record<string, unknown>)?.content as unknown, (d?.raw_message as Record<string, unknown>)?.content as unknown);
    const sanitized = sanitizeInboundContent(raw);
    const withImage = appendImageFromAttachments(sanitized, d?.attachments as unknown);

    return {
      shouldRecord: true,
      peerType: groupId ? 'group' : 'user',
      peerId,
      peerOpenId: firstNonEmptyString(groupId, userId),
      peerName: firstNonEmptyString((d?.author as Record<string, unknown>)?.username as unknown, (d?.author as Record<string, unknown>)?.id as unknown) || `${groupId ? '群聊' : '用户'} ${peerId}`,
      content: withImage || '[非文本消息]',
      inboundMsgId: baseInboundMsgId
    };
  }

  return null;
}
