/**
 * QQ 机器人官方 API SDK
 * 
 * 完整适配官方 API v2，包含：
 * - Token 认证与自动刷新
 * - WebSocket Gateway 连接（Resume 支持）
 * - 全部事件类型解析
 * - 消息发送（文本/Markdown/Ark/Embed/键盘/媒体）
 * - 消息撤回、文件上传
 * - 完整错误码映射与处理
 * 
 * 官方文档：https://bot.q.qq.com/wiki/develop/api-v2/
 */

// ---- 类型 ----
export type {
  // Gateway
  GatewayPayload,
  GatewayHelloData,
  GatewayIdentifyData,
  GatewayResumeData,
  GatewayReadyData,
  // 消息
  SendMessageRequest,
  SendMessageResponse,
  MarkdownPayload,
  ArkPayload,
  ArkKvPair,
  EmbedPayload,
  KeyboardPayload,
  KeyboardButton,
  MediaPayload,
  MessageReference,
  // 数据
  InboundMessage,
  BotUser,
  MessageAuthor,
  MessageMember,
  MessageAttachment,
  // 事件
  ParsedInboundEvent,
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
  // 认证
  AppAccessTokenResponse,
  TokenCache,
  BotCredentials,
  ReconnectConfig,
  ApiError,
} from './types.js';

export {
  GatewayOpcode,
  Intent,
  DEFAULT_INTENTS,
  MessageType,
} from './types.js';

// ---- 认证 ----
export {
  fetchAccessToken,
  fetchGatewayUrl,
  authHeaders,
  withAuthRetry,
  clearTokenCache,
  clearAllTokenCache,
  QQ_API_BASE,
  QQ_GATEWAY_API_BASE,
  QQ_GATEWAY_URL,
  QQ_AUTH_PREFIX,
} from './auth.js';

// ---- 错误码 ----
export {
  ErrorCode,
  parseApiError,
  getFriendlyErrorMessage,
} from './errors.js';

export type { ErrorCategory, ParsedError } from './errors.js';

// ---- 消息 ----
export {
  sendTextMessage,
  sendMarkdownMessage,
  sendArkMessage,
  sendEmbedMessage,
  sendKeyboardMessage,
  sendMarkdownWithKeyboard,
  sendMediaMessage,
  sendMessageWithFallback,
  uploadMedia,
  recallMessage,
} from './messages.js';

// ---- 事件 ----
export { parseGatewayEvent, extractSessionId } from './events.js';

// ---- Gateway ----
export { GatewayClient } from './gateway.js';
export type { GatewayState, GatewayCallbacks } from './gateway.js';

// ---- Segment & MessageBuilder ----
export {
  segment,
  MessageBuilder,
} from './segment.js';

export type {
  SegmentType,
  TextSegment,
  ImageSegment,
  AtSegment,
  ReplySegment,
  FaceSegment,
  MarkdownSegment,
  ArkSegment,
  EmbedSegment,
  KeyboardSegment,
  AudioSegment,
  VideoSegment,
  FileSegment,
} from './segment.js';

// ---- Bot 客户端 ----
export { QQBot, BotMessageEvent } from './bot.js';
export type { QQBotOptions, BotAccount as QQBotAccount, BotEventType } from './bot.js';
