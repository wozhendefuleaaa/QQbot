import { addPlatformLog, ensureConversationForInboundByAccount, nowIso } from '../../core/store.js';
import { dispatchMessage } from '../../core/plugin-manager.js';
import { accounts } from '../../core/store.js';
import { broadcastNewMessage } from '../sse/routes.js';

export type OneBotMessageEvent = {
  self_id?: number | string;
  user_id?: number | string;
  group_id?: number | string;
  message_id?: number | string;
  message?: unknown;
  raw_message?: string;
  post_type?: string;
  message_type?: 'private' | 'group';
  sender?: {
    nickname?: string;
    card?: string;
  };
};

function stringifySegment(segment: any): string {
  if (!segment || typeof segment !== 'object') return '';
  const type = String(segment.type || '').trim();
  const data = segment.data || {};

  switch (type) {
    case 'text':
      return typeof data.text === 'string' ? data.text : '';
    case 'image':
      return '[图片]';
    case 'face':
      return '[表情]';
    case 'at':
      return data.qq ? `@${data.qq}` : '@用户';
    case 'reply':
      return '[回复]';
    default:
      return type ? `[${type}]` : '';
  }
}

export function normalizeOneBotMessageContent(message: unknown, rawMessage?: string): string {
  if (typeof rawMessage === 'string' && rawMessage.trim()) {
    return rawMessage.trim();
  }

  if (typeof message === 'string') {
    return message.trim();
  }

  if (Array.isArray(message)) {
    return message.map((item) => stringifySegment(item)).join('').trim();
  }

  return '';
}

export async function handleOneBotIncomingMessage(accountId: string, event: OneBotMessageEvent): Promise<boolean> {
  if (event.post_type !== 'message') {
    return false;
  }

  const peerType = event.message_type === 'group' ? 'group' : event.message_type === 'private' ? 'user' : null;
  if (!peerType) {
    return false;
  }

  const peerId = peerType === 'group' ? String(event.group_id || '') : String(event.user_id || '');
  if (!peerId) {
    addPlatformLog('WARN', `OneBot 消息缺少 peerId: accountId=${accountId}`);
    return false;
  }

  const content = normalizeOneBotMessageContent(event.message, event.raw_message);
  if (!content) {
    addPlatformLog('WARN', `OneBot 消息内容为空: accountId=${accountId}, peerId=${peerId}`);
    return false;
  }

  const peerName = peerType === 'group'
    ? `群聊 ${peerId}`
    : event.sender?.card || event.sender?.nickname || `用户 ${peerId}`;

  const inbound = ensureConversationForInboundByAccount(accountId, peerId, content, peerType, {
    peerName,
    inboundMsgId: event.message_id ? String(event.message_id) : null,
  });

  if (!inbound) {
    addPlatformLog('WARN', `OneBot 入站消息未能写入存储: accountId=${accountId}, peerId=${peerId}`);
    return false;
  }

  const message = {
    id: inbound.messageId,
    accountId,
    conversationId: inbound.conversationId,
    direction: 'in' as const,
    text: content,
    createdAt: nowIso(),
  };

  const account = accounts.find((item) => item.id === accountId);
  addPlatformLog('INFO', `OneBot 消息入站: account=${account?.name || accountId}, peerType=${peerType}, peerId=${peerId}`);
  broadcastNewMessage(inbound.conversationId, message);

  return dispatchMessage(
    message,
    peerId,
    peerType,
    event.message_id ? String(event.message_id) : undefined,
  );
}
