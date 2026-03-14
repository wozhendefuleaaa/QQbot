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
  recordMsgIdTimestamp 
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
