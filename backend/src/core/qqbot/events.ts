/**
 * QQ 机器人事件解析模块
 * 
 * 完整适配所有官方事件类型，包括：
 * - 群消息、单聊消息
 * - 频道消息、频道私信
 * - 互动事件
 * - 好友事件、群事件
 * - 频道成员事件
 * - 消息反应事件
 * - 论坛事件、音频事件
 * - Ready / Resumed 网关事件
 */

import type {
  GatewayPayload,
  GatewayReadyData,
  InboundMessage,
  GroupAtMessageEvent,
  C2CMessageEvent,
  InteractionEvent,
  FriendAddEvent,
  GroupRobotEvent,
  GuildEvent,
  ChannelEvent,
  GuildMemberEvent,
  MessageReactionEvent,
  ForumEvent,
  AudioEvent,
  ParsedInboundEvent,
} from './types.js';

// ==================== 内容清理 ====================

const FACE_PATTERN = /<faceType=\d+,faceId="[^"]+",ext="[^"]+">/g;

function sanitizeContent(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/^\/+/, '')
    .replace(FACE_PATTERN, '')
    .replace(/^<@!?\w+>\s*/g, '')
    .trim();
}

function firstNonEmptyString(...candidates: unknown[]): string | undefined {
  for (const x of candidates) {
    if (typeof x === 'string' && x.trim()) return x.trim();
  }
  return undefined;
}

function readPath(source: unknown, path: string): unknown {
  return path.split('/').reduce<unknown>(
    (acc, key) =>
      acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
    source
  );
}

function appendImageFromAttachments(content: string, attachments: unknown): string {
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

function getPeerName(d: Record<string, unknown>, defaultPrefix: string, peerId: string): string {
  return (
    firstNonEmptyString(
      (d?.author as Record<string, unknown>)?.username as unknown,
      (d?.author as Record<string, unknown>)?.id as unknown
    ) || `${defaultPrefix} ${peerId}`
  );
}

// ==================== 事件分发 ====================

/**
 * 解析所有入站 Gateway 事件
 * 
 * @returns ParsedInboundEvent | null (null 表示事件无需记录)
 */
export function parseGatewayEvent(payload: GatewayPayload): ParsedInboundEvent | null {
  const eventType = payload.t || '';
  const d = (payload.d || {}) as Record<string, unknown>;

  // ---- 群聊 @消息 ----
  if (eventType === 'GROUP_AT_MESSAGE_CREATE') {
    return parseGroupAtMessage(d, eventType);
  }

  // ---- 单聊消息 ----
  if (eventType === 'C2C_MESSAGE_CREATE') {
    return parseC2CMessage(d, eventType);
  }

  // ---- 公域频道 AT 消息 ----
  if (eventType === 'AT_MESSAGE_CREATE') {
    return parsePublicAtMessage(d, eventType);
  }

  // ---- 私域频道全部消息 ----
  if (eventType === 'MESSAGE_CREATE') {
    return parseChannelMessage(d, eventType);
  }

  // ---- 频道私信 ----
  if (eventType === 'DIRECT_MESSAGE_CREATE') {
    return parseDirectMessage(d, eventType);
  }

  // ---- 互动事件 ----
  if (eventType === 'INTERACTION_CREATE') {
    return parseInteraction(payload);
  }

  // ---- 好友添加 ----
  if (eventType === 'FRIEND_ADD') {
    return parseFriendAdd(payload);
  }

  // ---- 群机器人事件 ----
  if (eventType === 'GROUP_ADD_ROBOT') {
    return parseGroupRobot(d, eventType, '入群');
  }
  if (eventType === 'GROUP_DEL_ROBOT') {
    return parseGroupRobot(d, eventType, '退群');
  }

  // ---- 群消息拒绝 ----
  if (eventType === 'GROUP_MSG_REJECT') {
    return parseRejectEvent(d, eventType, 'group');
  }

  // ---- 单聊消息拒绝 ----
  if (eventType === 'C2C_MSG_REJECT') {
    return parseRejectEvent(d, eventType, 'user');
  }

  // ---- 消息接收 ----
  if (eventType === 'GROUP_MSG_RECEIVE' || eventType === 'C2C_MSG_RECEIVE') {
    return parseReceiveEvent(d, eventType);
  }

  // ---- 消息审核 ----
  if (eventType === 'MESSAGE_AUDIT_PASS' || eventType === 'MESSAGE_AUDIT_REJECT') {
    return {
      eventType,
      shouldRecord: true,
      peerType: 'user',
      peerId: firstNonEmptyString(d?.channel_id, d?.guild_id) || 'audit',
      peerName: `消息审核: ${eventType}`,
      content: firstNonEmptyString(d?.content, d?.audit_result) || '[审核事件]',
      rawPayload: d,
    };
  }

  // ---- 网关就绪 ----
  if (eventType === 'READY') {
    return {
      eventType,
      shouldRecord: false,
      peerType: 'user',
      peerId: 'system',
      peerName: 'Gateway Ready',
      content: JSON.stringify(d),
      rawPayload: d,
    };
  }

  // ---- 会话恢复 ----
  if (eventType === 'RESUMED') {
    return {
      eventType,
      shouldRecord: false,
      peerType: 'user',
      peerId: 'system',
      peerName: 'Gateway Resumed',
      content: 'Session resumed',
      rawPayload: d,
    };
  }

  // ---- 频道事件 (不记录为会话) ----
  if (['GUILD_CREATE', 'GUILD_UPDATE', 'GUILD_DELETE'].includes(eventType)) {
    return {
      eventType,
      shouldRecord: false,
      peerType: 'channel',
      peerId: firstNonEmptyString(d?.id) || 'guild',
      peerName: (d as unknown as GuildEvent)?.name || eventType,
      content: `${eventType}: ${(d as unknown as GuildEvent)?.name || ''}`,
      rawPayload: d,
    };
  }

  // ---- 子频道事件 ----
  if (['CHANNEL_CREATE', 'CHANNEL_UPDATE', 'CHANNEL_DELETE'].includes(eventType)) {
    return {
      eventType,
      shouldRecord: false,
      peerType: 'channel',
      peerId: firstNonEmptyString(d?.id) || 'channel',
      peerName: (d as unknown as ChannelEvent)?.name || eventType,
      content: `${eventType}: ${(d as unknown as ChannelEvent)?.name || ''}`,
      rawPayload: d,
    };
  }

  // ---- 频道成员事件 ----
  if (['GUILD_MEMBER_ADD', 'GUILD_MEMBER_UPDATE', 'GUILD_MEMBER_REMOVE'].includes(eventType)) {
    return {
      eventType,
      shouldRecord: false,
      peerType: 'channel',
      peerId: firstNonEmptyString((d as unknown as GuildMemberEvent)?.user?.id) || 'member',
      peerName: (d as unknown as GuildMemberEvent)?.user?.username || 'Unknown',
      content: `${eventType}: ${(d as unknown as GuildMemberEvent)?.user?.username || ''}`,
      rawPayload: d,
    };
  }

  // ---- 消息反应事件 ----
  if (['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(eventType)) {
    return {
      eventType,
      shouldRecord: false,
      peerType: 'channel',
      peerId: firstNonEmptyString((d as unknown as MessageReactionEvent)?.user_id) || 'reactor',
      peerName: `Reaction: ${eventType}`,
      content: `emoji_id=${(d as unknown as MessageReactionEvent)?.emoji?.id}`,
      rawPayload: d,
    };
  }

  // ---- 论坛事件 ----
  if (
    [
      'FORUM_THREAD_CREATE',
      'FORUM_THREAD_UPDATE',
      'FORUM_THREAD_DELETE',
      'FORUM_POST_CREATE',
      'FORUM_POST_DELETE',
      'FORUM_REPLY_CREATE',
      'FORUM_REPLY_DELETE',
      'FORUM_PUBLISH_AUDIT_RESULT',
    ].includes(eventType)
  ) {
    return {
      eventType,
      shouldRecord: false,
      peerType: 'channel',
      peerId: firstNonEmptyString((d as unknown as ForumEvent)?.thread_id, d?.channel_id) || 'forum',
      peerName: eventType,
      content: firstNonEmptyString((d as unknown as ForumEvent)?.content, (d as unknown as ForumEvent)?.title) || eventType,
      rawPayload: d,
    };
  }

  // ---- 音频事件 ----
  if (['AUDIO_START', 'AUDIO_FINISH', 'AUDIO_ON_MIC', 'AUDIO_OFF_MIC'].includes(eventType)) {
    return {
      eventType,
      shouldRecord: false,
      peerType: 'channel',
      peerId: firstNonEmptyString((d as unknown as AudioEvent)?.channel_id) || 'audio',
      peerName: eventType,
      content: eventType,
      rawPayload: d,
    };
  }

  // ---- 通用 MESSAGE 回退 ----
  if (eventType.includes('MESSAGE')) {
    return parseGenericMessage(d, eventType, payload);
  }

  // 未知事件
  return null;
}

// ==================== 具体事件解析器 ====================

function parseGroupAtMessage(d: Record<string, unknown>, eventType: string): ParsedInboundEvent | null {
  const groupId = firstNonEmptyString(d?.group_openid as unknown, d?.group_id as unknown);
  if (!groupId) return null;

  const raw = firstNonEmptyString(
    d?.content as unknown,
    (d?.message as Record<string, unknown>)?.content as unknown
  );
  const sanitized = sanitizeContent(raw);
  const withImage = appendImageFromAttachments(sanitized, d?.attachments);

  return {
    eventType,
    shouldRecord: true,
    peerType: 'group',
    peerId: groupId,
    peerOpenId: firstNonEmptyString(d?.group_openid as unknown),
    peerName: getPeerName(d, '群聊', groupId),
    content: withImage || '[非文本消息]',
    inboundMsgId: firstNonEmptyString(d?.id as unknown, d?.message_id as unknown),
    rawPayload: d,
  };
}

function parseC2CMessage(d: Record<string, unknown>, eventType: string): ParsedInboundEvent | null {
  const userId = firstNonEmptyString(
    (d?.author as Record<string, unknown>)?.member_openid as unknown,
    (d?.author as Record<string, unknown>)?.user_openid as unknown,
    d?.user_openid as unknown,
    (d?.author as Record<string, unknown>)?.id as unknown
  );
  if (!userId) return null;

  const raw = firstNonEmptyString(d?.content as unknown);
  const sanitized = sanitizeContent(raw);
  const withImage = appendImageFromAttachments(sanitized, d?.attachments);

  return {
    eventType,
    shouldRecord: true,
    peerType: 'user',
    peerId: userId,
    peerOpenId: firstNonEmptyString((d?.author as Record<string, unknown>)?.user_openid as unknown),
    peerName: getPeerName(d, '用户', userId),
    content: withImage || '[非文本消息]',
    inboundMsgId: firstNonEmptyString(d?.id as unknown),
    rawPayload: d,
  };
}

function parsePublicAtMessage(d: Record<string, unknown>, eventType: string): ParsedInboundEvent | null {
  const channelId = firstNonEmptyString(d?.channel_id as unknown, d?.id as unknown);
  if (!channelId) return null;

  return {
    eventType,
    shouldRecord: true,
    peerType: 'channel',
    peerId: channelId,
    peerName: getPeerName(d, '频道', channelId),
    content: sanitizeContent(d?.content as unknown) || '[频道消息]',
    inboundMsgId: firstNonEmptyString(d?.id as unknown),
    rawPayload: d,
  };
}

function parseChannelMessage(d: Record<string, unknown>, eventType: string): ParsedInboundEvent | null {
  const channelId = firstNonEmptyString(d?.channel_id as unknown);
  if (!channelId) return null;

  return {
    eventType,
    shouldRecord: true,
    peerType: 'channel',
    peerId: channelId,
    peerName: getPeerName(d, '频道消息', channelId),
    content: sanitizeContent(d?.content as unknown) || '[频道消息]',
    inboundMsgId: firstNonEmptyString(d?.id as unknown),
    rawPayload: d,
  };
}

function parseDirectMessage(d: Record<string, unknown>, eventType: string): ParsedInboundEvent | null {
  const guildId = firstNonEmptyString(d?.guild_id as unknown);
  if (!guildId) return null;

  return {
    eventType,
    shouldRecord: true,
    peerType: 'user',
    peerId: guildId,
    peerName: getPeerName(d, '私信', guildId),
    content: sanitizeContent(d?.content as unknown) || '[私信消息]',
    inboundMsgId: firstNonEmptyString(d?.id as unknown),
    rawPayload: d,
  };
}

function parseInteraction(payload: GatewayPayload): ParsedInboundEvent | null {
  const d = (payload.d || {}) as Record<string, unknown>;

  // 过滤 type=13 的系统交互
  if (Number(readPath(payload, 'd/type')) === 13) return null;

  const chatType = Number(readPath(payload, 'd/chat_type'));
  const scene = String(readPath(payload, 'd/scene') || '');
  const isGroup = chatType === 1 || scene === 'group';

  const groupId = firstNonEmptyString(
    readPath(payload, 'd/group_openid') as unknown,
    readPath(payload, 'd/group_id') as unknown
  );
  const userId = firstNonEmptyString(
    readPath(payload, 'd/group_member_openid') as unknown,
    readPath(payload, 'd/user_openid') as unknown,
    readPath(payload, 'd/author/id') as unknown
  );

  const peerId = isGroup ? groupId : userId;
  if (!peerId) return null;

  const content = sanitizeContent(readPath(payload, 'd/data/resolved/button_data')) || '[交互事件]';

  return {
    eventType: 'INTERACTION_CREATE',
    shouldRecord: true,
    peerType: isGroup ? 'group' : 'user',
    peerId,
    peerOpenId: firstNonEmptyString(groupId, userId),
    peerName: isGroup ? `群聊 ${peerId}` : `用户 ${peerId}`,
    content,
    inboundMsgId: firstNonEmptyString(payload.id),
    rawPayload: d,
  };
}

function parseFriendAdd(payload: GatewayPayload): ParsedInboundEvent | null {
  const d = (payload.d || {}) as Record<string, unknown>;
  const openid = firstNonEmptyString(d?.openid as unknown);
  return {
    eventType: 'FRIEND_ADD',
    shouldRecord: true,
    peerType: 'user',
    peerId: openid || 'friend_add',
    peerName: `新好友: ${openid || 'unknown'}`,
    content: `好友添加: ${openid}`,
    inboundMsgId: undefined,
    rawPayload: d,
  };
}

function parseGroupRobot(d: Record<string, unknown>, eventType: string, label: string): ParsedInboundEvent | null {
  const groupId = firstNonEmptyString(d?.group_openid as unknown);
  return {
    eventType,
    shouldRecord: true,
    peerType: 'group',
    peerId: groupId || 'robot_event',
    peerName: `${label}: ${groupId || ''}`,
    content: `${label}: 群 ${groupId}, 操作者 ${d?.op_member_openid || 'unknown'}`,
    inboundMsgId: undefined,
    rawPayload: d,
  };
}

function parseRejectEvent(d: Record<string, unknown>, eventType: string, peerType: 'user' | 'group'): ParsedInboundEvent | null {
  const msgId = firstNonEmptyString(d?.msg_id as unknown);
  return {
    eventType,
    shouldRecord: false,
    peerType,
    peerId: msgId || 'reject',
    peerName: `消息拒绝: ${eventType}`,
    content: `消息被拒绝: msg_id=${msgId}, reason=${d?.reason || 'unknown'}`,
    inboundMsgId: undefined,
    rawPayload: d,
  };
}

function parseReceiveEvent(d: Record<string, unknown>, eventType: string): ParsedInboundEvent | null {
  const msgId = firstNonEmptyString(d?.msg_id as unknown);
  return {
    eventType,
    shouldRecord: false,
    peerType: eventType.startsWith('GROUP') ? 'group' : 'user',
    peerId: msgId || 'receive',
    peerName: `消息接收确认: ${eventType}`,
    content: `消息接收: msg_id=${msgId}`,
    inboundMsgId: undefined,
    rawPayload: d,
  };
}

function parseGenericMessage(d: Record<string, unknown>, eventType: string, payload: GatewayPayload): ParsedInboundEvent | null {
  const groupId = firstNonEmptyString(
    d?.group_openid as unknown,
    d?.group_id as unknown,
    d?.channel_id as unknown
  );
  const userId = firstNonEmptyString(
    (d?.author as Record<string, unknown>)?.member_openid as unknown,
    (d?.author as Record<string, unknown>)?.user_openid as unknown,
    d?.user_openid as unknown,
    (d?.author as Record<string, unknown>)?.id as unknown
  );
  const peerId = groupId || userId;
  if (!peerId) return null;

  const raw = firstNonEmptyString(d?.content as unknown);
  const sanitized = sanitizeContent(raw);
  const withImage = appendImageFromAttachments(sanitized, d?.attachments);

  return {
    eventType,
    shouldRecord: true,
    peerType: groupId ? 'group' : 'user',
    peerId,
    peerOpenId: firstNonEmptyString(groupId, userId),
    peerName: getPeerName(d, groupId ? '群聊' : '用户', peerId),
    content: withImage || '[非文本消息]',
    inboundMsgId: firstNonEmptyString(payload.id, d?.id as unknown),
    rawPayload: d,
  };
}

/**
 * 从 READY 事件中提取 session_id
 */
export function extractSessionId(parsed: ParsedInboundEvent): string | null {
  if (parsed.eventType !== 'READY') return null;
  try {
    const data = typeof parsed.content === 'string' ? JSON.parse(parsed.content) : parsed.content;
    return (data as GatewayReadyData)?.session_id || null;
  } catch {
    return null;
  }
}
