/**
 * QQ 机器人官方 API 类型定义
 * 基于官方文档：https://bot.q.qq.com/wiki/develop/api-v2/
 */

// ==================== Gateway Opcodes ====================
export const GatewayOpcode = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  RESUME: 6,
  RECONNECT: 7,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11,
} as const;

export type GatewayOpcode = (typeof GatewayOpcode)[keyof typeof GatewayOpcode];

// ==================== Intents (事件订阅位掩码) ====================
export const Intent = {
  /** 频道事件 (默认) */
  GUILDS: 1 << 0,
  /** 频道成员事件 (默认) */
  GUILD_MEMBERS: 1 << 1,
  /** 私域频道消息事件 (私域机器人) */
  GUILD_MESSAGES: 1 << 9,
  /** 消息表情表态事件 */
  GUILD_MESSAGE_REACTIONS: 1 << 10,
  /** 频道私信事件 */
  DIRECT_MESSAGE: 1 << 12,
  /** 群聊+单聊事件合集 */
  GROUP_AND_C2C_EVENT: 1 << 25,
  /** 互动事件 */
  INTERACTION: 1 << 26,
  /** 消息审核事件 */
  MESSAGE_AUDIT: 1 << 27,
  /** 论坛事件 (私域) */
  FORUMS_EVENT: 1 << 28,
  /** 音频事件 */
  AUDIO_ACTION: 1 << 29,
  /** 公域频道消息事件 (默认) */
  PUBLIC_GUILD_MESSAGES: 1 << 30,
} as const;

/** 默认订阅：公域消息 + 频道基础 + 频道成员 */
export const DEFAULT_INTENTS =
  Intent.PUBLIC_GUILD_MESSAGES | Intent.GUILDS | Intent.GUILD_MEMBERS;

// ==================== Gateway Payload ====================
export interface GatewayPayload<T = unknown> {
  op: GatewayOpcode;
  d?: T;
  s?: number;
  t?: string;
  id?: string;
}

export interface GatewayHelloData {
  heartbeat_interval: number;
}

export interface GatewayIdentifyData {
  token: string;
  intents: number;
  shard: [number, number];
  properties?: {
    $os?: string;
    $browser?: string;
    $device?: string;
  };
}

export interface GatewayResumeData {
  token: string;
  session_id: string;
  seq: number;
}

export interface GatewayReadyData {
  version: number;
  session_id: string;
  user: BotUser;
  shard: [number, number];
}

// ==================== 消息类型 ====================
export const MessageType = {
  TEXT: 0,
  MARKDOWN: 2,
  ARK: 3,
  EMBED: 4,
  KEYBOARD: 5,
  MEDIA: 7,
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

// ==================== 消息载荷 ====================

export interface MarkdownPayload {
  /** 自定义模板ID (需在开放平台配置) */
  custom_template_id?: string;
  /** 模板参数 */
  params?: Array<{ key: string; values: string[] }>;
  /** 原生 Markdown 内容 (与 custom_template_id 互斥) */
  content?: string;
}

export interface ArkKvPair {
  key: string;
  value?: string;
  obj?: Array<{ obj_kv: Array<{ key: string; value: string }> }>;
}

export interface ArkPayload {
  template_id: number;
  kv: ArkKvPair[];
}

export interface EmbedPayload {
  title?: string;
  prompt?: string;
  thumbnail?: { url: string };
  fields?: Array<{ name: string }>;
}

export interface KeyboardButton {
  id?: string;
  render_data: {
    label: string;
    visited_label?: string;
    style?: number;
  };
  action: {
    type: number;
    permission?: {
      type: number;
      specify_role_ids?: string[];
      specify_user_ids?: string[];
    };
    click_limit?: number;
    data?: string;
    at_bot_show_channel_list?: boolean;
  };
}

export interface KeyboardPayload {
  rows: Array<{ buttons: KeyboardButton[] }>;
}

export interface MediaPayload {
  file_info: string;
}

export interface MessageReference {
  message_id: string;
  ignore_get_message_error?: boolean;
}

/** 发送消息请求体 */
export interface SendMessageRequest {
  /** 消息类型 */
  msg_type: MessageType;
  /** 文本内容 (msg_type=0) */
  content?: string;
  /** Markdown (msg_type=2) */
  markdown?: MarkdownPayload;
  /** Ark (msg_type=3) */
  ark?: ArkPayload;
  /** Embed (msg_type=4) */
  embed?: EmbedPayload;
  /** 键盘 (可与文本/markdown组合) */
  keyboard?: KeyboardPayload;
  /** 富媒体 (msg_type=7) */
  media?: MediaPayload;
  /** 消息引用 */
  message_reference?: MessageReference;
  /** 被动回复：收到的消息ID */
  msg_id?: string;
  /** 被动回复：收到的事件ID */
  event_id?: string;
  /** 回复序号 (默认1) */
  msg_seq?: number;
  /** 互动召回消息 (仅单聊) */
  is_wakeup?: boolean;
}

/** 发送消息成功响应 */
export interface SendMessageResponse {
  id: string;
  timestamp: number;
}

// ==================== 机器人用户信息 ====================
export interface BotUser {
  id: string;
  username: string;
  avatar: string;
  bot: boolean;
  union_openid?: string;
  union_user_account?: string;
}

// ==================== 消息数据 ====================
export interface MessageAttachment {
  content_type: string;
  url: string;
  proxy_url?: string;
  filename?: string;
  height?: number;
  width?: number;
  size?: number;
}

export interface MessageAuthor {
  id: string;
  username: string;
  avatar: string;
  member_openid?: string;
  user_openid?: string;
}

export interface MessageMember {
  nick?: string;
  roles?: string[];
}

export interface InboundMessage {
  id: string;
  channel_id?: string;
  guild_id?: string;
  group_openid?: string;
  group_id?: string;
  content: string;
  timestamp: string;
  tts: boolean;
  mentions?: Array<{ id: string; username?: string; avatar?: string }>;
  author: MessageAuthor;
  member?: MessageMember;
  attachments?: MessageAttachment[];
  message_reference?: { message_id: string };
}

// ==================== 事件数据 ====================
export interface GroupAtMessageEvent {
  id: string;
  group_openid: string;
  group_id?: string;
  content: string;
  timestamp: string;
  author: MessageAuthor;
  member?: MessageMember;
  attachments?: MessageAttachment[];
}

export interface C2CMessageEvent {
  id: string;
  author: MessageAuthor;
  content: string;
  timestamp: string;
  attachments?: MessageAttachment[];
}

export interface InteractionEvent {
  id: string;
  application_id: string;
  type: number;
  chat_type?: number;
  scene?: string;
  group_openid?: string;
  group_id?: string;
  group_member_openid?: string;
  user_openid?: string;
  guild_id?: string;
  channel_id?: string;
  author?: { id: string; username?: string; avatar?: string };
  data: {
    resolved?: { button_data?: string; button_id?: string };
    type?: number;
  };
}

export interface FriendAddEvent {
  openid: string;
  timestamp: string;
}

export interface GroupRobotEvent {
  group_openid: string;
  op_member_openid: string;
  timestamp: string;
}

export interface GuildEvent {
  id: string;
  name: string;
  icon: string;
  owner_id: string;
}

export interface ChannelEvent {
  id: string;
  guild_id: string;
  name: string;
  type: number;
  position: number;
  parent_id: string;
}

export interface GuildMemberEvent {
  guild_id: string;
  joined_at?: string;
  nick?: string;
  user: BotUser;
  roles: string[];
}

export interface MessageReactionEvent {
  user_id: string;
  channel_id: string;
  guild_id: string;
  target: {
    id: string;
    type: number;
  };
  emoji: {
    id: string;
    type: number;
  };
}

export interface ForumEvent {
  guild_id: string;
  channel_id: string;
  thread_id: string;
  author_id?: string;
  title?: string;
  content?: string;
}

export interface AudioEvent {
  channel_id: string;
  guild_id: string;
}

// ==================== 标准化入站事件 ====================
export interface ParsedInboundEvent {
  /** 事件类型 (t 字段) */
  eventType: string;
  /** 是否需要记录到存储 */
  shouldRecord: boolean;
  /** 目标类型 */
  peerType: 'user' | 'group' | 'channel';
  /** 目标ID (openid) */
  peerId: string;
  /** QQ API 级别的 openid (用于发送回复) */
  peerOpenId?: string;
  /** 显示名称 */
  peerName: string;
  /** 清理后的消息内容 */
  content: string;
  /** 入站消息ID (用于被动回复) */
  inboundMsgId?: string;
  /** 原始事件载荷 */
  rawPayload: unknown;
}

// ==================== Token 认证 ====================
export interface AppAccessTokenResponse {
  access_token: string;
  accessToken?: string;
  expires_in: number;
  expiresIn?: number;
}

export interface TokenCache {
  token: string;
  expiresAt: number;
}

// ==================== 错误码 ====================
export interface ApiError {
  code: number;
  message: string;
}

// ==================== 重连配置 ====================
export interface ReconnectConfig {
  maxDelay: number;
  baseDelay: number;
  maxAttempts: number;
  jitterEnabled: boolean;
}

// ==================== 机器人账号凭证 ====================
export interface BotCredentials {
  appId: string;
  appSecret: string;
  appToken?: string;
}
