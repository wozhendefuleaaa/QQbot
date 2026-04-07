/**
 * Gateway 模块入口
 * 重新导出所有 Gateway 相关功能
 */

// 核心连接功能
export { connectGateway, disconnectGateway } from './gateway-core.js';

// 消息发送功能
export {
  trySendToQQ,
  recallMessage,
  uploadImage,
  sendImageMessage,
  recordMsgIdTimestamp,
  sendMarkdownMessage,
  sendArkMessage,
  sendEmbedMessage,
  sendKeyboardMessage,
  sendMixedMessage,
  QQ_MSG_TYPE
} from './gateway-message.js';

// 导出消息类型
export type {
  QQMarkdownPayload,
  QQArkPayload,
  QQEmbedPayload,
  QQKeyboardPayload,
  QQMessagePayload
} from './gateway-message.js';

// 群组管理功能
export { 
  getGroupMembers, 
  muteGroupMember, 
  unmuteGroupMember, 
  kickGroupMember 
} from './gateway-group.js';

// 工具函数
export { 
  parseInboundEvent, 
  sanitizeInboundContent, 
  firstNonEmptyString, 
  safePayloadSnippet 
} from './gateway-utils.js';

// 类型导出
export type { ParsedInboundEvent } from './gateway-types.js';
export type { GatewayPayload, GatewayHelloData } from './gateway-utils.js';

// 常量导出
export { 
  OP_RECONNECT, 
  OP_INVALID_SESSION, 
  OP_HELLO, 
  OP_HEARTBEAT_ACK, 
  DEFAULT_INTENTS, 
  FACE_PATTERN 
} from './gateway-utils.js';

// 频道管理功能
export {
  getUserInfo,
  getUserGuilds,
  getGuildInfo,
  getChannels,
  getChannelInfo,
  createChannel,
  updateChannel,
  deleteChannel,
  CHANNEL_TYPE,
  CHANNEL_PERMISSION
} from './gateway-channel.js';

// 频道相关类型导出
export type {
  QQUserInfo,
  QQGuildInfo,
  QQChannelInfo,
  CreateChannelRequest,
  UpdateChannelRequest
} from './gateway-channel.js';

// 错误处理功能
export {
  ERROR_TYPE,
  createGatewayError,
  retry,
  handleApiResponse,
  safeApiCall
} from './gateway-error.js';

// 错误相关类型导出
export type {
  GatewayError,
  RetryOptions
} from './gateway-error.js';
