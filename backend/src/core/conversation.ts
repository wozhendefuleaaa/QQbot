import { Conversation, Message } from '../types.js';
import { id, nowIso } from './utils.js';
import { conversations, messages, scheduleSaveChatDataToDisk } from './storage/chat.js';
import { platformStatus } from './platform-status.js';
import { accounts } from './storage/accounts.js';

export function ensureConversationForInbound(
  peerId: string,
  content: string,
  peerType: 'user' | 'group' = 'user',
  options?: { peerName?: string; inboundMsgId?: string | null }
) {
  const accountId = platformStatus.connectedAccountId || accounts.find((a) => a.status === 'ONLINE')?.id || accounts[0]?.id;
  if (!accountId) return null;

  let conv = conversations.find(
    (c) => c.accountId === accountId && c.peerId === peerId && c.peerType === peerType
  );
  if (!conv) {
    conv = {
      id: id('conv'),
      accountId,
      peerId,
      peerType,
      peerName: options?.peerName || `${peerType === 'group' ? '群聊' : '用户'} ${peerId}`,
      lastMessage: '',
      lastInboundMsgId: null,
      updatedAt: nowIso()
    };
    conversations.unshift(conv);
  }

  if (options?.peerName) {
    conv.peerName = options.peerName;
  }

  const msg: Message = {
    id: id('msg'),
    accountId,
    conversationId: conv.id,
    direction: 'in',
    text: content,
    createdAt: nowIso()
  };

  messages.push(msg);
  // 限制消息数量上限为 10000 条
  if (messages.length > 10000) {
    messages.splice(0, messages.length - 10000);
  }
  conv.lastMessage = content;
  conv.lastInboundMsgId = options?.inboundMsgId || conv.lastInboundMsgId || null;
  conv.updatedAt = nowIso();

  scheduleSaveChatDataToDisk();

  return {
    accountId,
    conversationId: conv.id,
    messageId: msg.id
  };
}
