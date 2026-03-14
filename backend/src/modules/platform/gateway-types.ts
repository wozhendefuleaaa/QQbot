import WebSocket from 'ws';

// Gateway 操作码
export const OP_RECONNECT = 7;
export const OP_INVALID_SESSION = 9;
export const OP_HELLO = 10;
export const OP_HEARTBEAT_ACK = 11;

// 默认 Intents
export const DEFAULT_INTENTS = (1 << 0) | (1 << 10) | (1 << 12) | (1 << 25) | (1 << 26) | (1 << 27);

// 表情匹配模式
export const FACE_PATTERN = /<faceType=\d+,faceId="[^"]+",ext="[^"]+">/g;

// 解析后的入站事件类型
export type ParsedInboundEvent = {
  shouldRecord: boolean;
  peerType: 'user' | 'group';
  peerId: string;
  peerOpenId: string | null;
  peerName: string;
  content: string;
  inboundMsgId: string | null;
};

// Gateway 消息载荷类型
export type GatewayPayload = {
  op?: number;
  s?: number;
  t?: string;
  id?: string;
  d?: unknown;
};

// Gateway 运行时状态
export type GatewayRuntime = {
  socket: WebSocket | null;
  heartbeatTimer: NodeJS.Timeout | null;
  reconnectTimer: NodeJS.Timeout | null;
  lastSeq: number | null;
  identifyPayload: Record<string, unknown> | null;
  heartbeatIntervalMs: number;
  lastHeartbeatAckAt: number;
  reconnectAttempts: number;
  reconnectForceRefreshToken: boolean;
  suppressReconnectCloseCount: number;
};

// 消息发送频率限制器类型
export type SendRateLimiter = {
  lastSendTime: number;
  minInterval: number;
  queue: { resolve: () => void; reject: (err: Error) => void }[];
  processing: boolean;
  waitForSlot(): Promise<void>;
  processQueue(): void;
  clear(): void;
};

// 消息 ID 时间戳缓存类型
export type MsgIdTimestampCache = {
  cache: Map<string, number>;
  maxAge: number;
  maxSize: number;
  set(msgId: string, timestamp: number): void;
  get(msgId: string): number | undefined;
  cleanup(): void;
};
