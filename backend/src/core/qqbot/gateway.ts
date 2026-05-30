/**
 * QQ 机器人 Gateway WebSocket 客户端
 * 
 * 完整实现官方 WebSocket 协议：
 * - Hello → Identify → Ready 连接流程
 * - Heartbeat 心跳保活
 * - Resume 会话恢复 (op=6)
 * - 指数退避自动重连
 * - 事件分发回调
 */

import WebSocket from 'ws';
import {
  GatewayOpcode,
  GatewayPayload,
  GatewayHelloData,
  GatewayReadyData,
  GatewayIdentifyData,
  GatewayResumeData,
  Intent,
  DEFAULT_INTENTS,
  BotCredentials,
  ReconnectConfig,
} from './types.js';
import { fetchAccessToken, fetchGatewayUrl, authHeaders, QQ_AUTH_PREFIX, clearTokenCache } from './auth.js';

// ==================== 连接状态 ====================

export type GatewayState =
  | 'disconnected'
  | 'connecting'
  | 'identifying'
  | 'resuming'
  | 'connected'
  | 'reconnecting';

// ==================== 回调接口 ====================

export interface GatewayCallbacks {
  /** 收到任意 Dispatch 事件 (op=0) */
  onEvent?: (payload: GatewayPayload) => void;
  /** 连接就绪 (收到 READY) */
  onReady?: (data: GatewayReadyData) => void;
  /** 会话恢复成功 (收到 RESUMED) */
  onResumed?: () => void;
  /** 连接状态变化 */
  onStateChange?: (state: GatewayState, detail?: string) => void;
  /** 连接错误 */
  onError?: (error: Error) => void;
  /** 日志 */
  onLog?: (level: 'INFO' | 'WARN' | 'ERROR', message: string) => void;
}

// ==================== 默认配置 ====================

const defaultReconnectConfig: ReconnectConfig = {
  maxDelay: 30000,
  baseDelay: 5000,
  maxAttempts: 0, // 0 = 无限重试
  jitterEnabled: true,
};

// ==================== GatewayClient ====================

export class GatewayClient {
  // ---- 配置 ----
  private credentials: BotCredentials;
  private intents: number;
  private shard: [number, number];
  private reconnectConfig: ReconnectConfig;
  private callbacks: GatewayCallbacks;

  // ---- 运行时状态 ----
  private ws: WebSocket | null = null;
  private state: GatewayState = 'disconnected';
  private sessionId: string | null = null;
  private lastSeq: number | null = null;
  private heartbeatInterval: number = 0;
  private lastHeartbeatAckAt: number = 0;

  // ---- 定时器 ----
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // ---- 重连计数器 ----
  private reconnectAttempts = 0;
  private intentionalClose = false;

  constructor(
    credentials: BotCredentials,
    options?: {
      intents?: number;
      shard?: [number, number];
      reconnect?: Partial<ReconnectConfig>;
      callbacks?: GatewayCallbacks;
    }
  ) {
    this.credentials = credentials;
    this.intents = options?.intents || DEFAULT_INTENTS;
    this.shard = options?.shard || [0, 1];
    this.reconnectConfig = { ...defaultReconnectConfig, ...options?.reconnect };
    this.callbacks = options?.callbacks || {};
  }

  // ==================== 公开 API ====================

  /** 建立连接 */
  async connect(): Promise<void> {
    if (this.ws) {
      this.disconnect();
    }

    this.setState('connecting');
    this.intentionalClose = false;

    try {
      const token = await fetchAccessToken(this.credentials);
      const wsUrl = await fetchGatewayUrl(token, this.credentials.appId);

      this.log('INFO', `连接 Gateway: ${wsUrl}`);

      const socket = new WebSocket(wsUrl, {
        headers: {
          Authorization: `${QQ_AUTH_PREFIX} ${token}`,
          'X-Union-Appid': this.credentials.appId,
        },
      });

      this.ws = socket;

      socket.on('open', () => this.onOpen());
      socket.on('message', (raw: WebSocket.RawData) => this.onMessage(raw));
      socket.on('close', (code: number, reason: Buffer) => this.onClose(code, reason));
      socket.on('error', (error: Error) => this.onSocketError(error));
    } catch (error) {
      this.log('ERROR', `Gateway 连接失败: ${error}`);
      this.setState('disconnected');
      this.callbacks.onError?.(error as Error);
      this.scheduleReconnect();
    }
  }

  /** 断开连接 */
  disconnect(): void {
    this.intentionalClose = true;
    this.clearTimers();
    this.setState('disconnected');
    if (this.ws) {
      try {
        this.ws.close(1000, 'Client disconnect');
      } catch {}
      this.ws = null;
    }
  }

  /** 当前状态 */
  getState(): GatewayState {
    return this.state;
  }

  /** 当前 session_id (用于外部日志) */
  getSessionId(): string | null {
    return this.sessionId;
  }

  // ==================== WebSocket 事件处理 ====================

  private onOpen(): void {
    this.log('INFO', 'WebSocket 已连接');
    // 等待 Hello (op=10)
  }

  private onMessage(raw: WebSocket.RawData): void {
    try {
      const payload = JSON.parse(String(raw)) as GatewayPayload;

      // 记录序列号
      if (typeof payload.s === 'number') {
        this.lastSeq = payload.s;
      }

      // ---- Hello (op=10) ----
      if (payload.op === GatewayOpcode.HELLO) {
        this.handleHello(payload.d as GatewayHelloData);
        return;
      }

      // ---- 心跳 ACK (op=11) ----
      if (payload.op === GatewayOpcode.HEARTBEAT_ACK) {
        this.lastHeartbeatAckAt = Date.now();
        if (this.heartbeatTimeout) {
          clearTimeout(this.heartbeatTimeout);
          this.heartbeatTimeout = null;
        }
        this.log('INFO', '心跳 ACK');
        return;
      }

      // ---- 服务端要求重连 (op=7) ----
      if (payload.op === GatewayOpcode.RECONNECT) {
        this.log('WARN', '网关要求重连 (OP 7)');
        this.setState('reconnecting');
        if (this.ws) {
          this.ws.close(4001, 'Server requested reconnect');
        }
        return;
      }

      // ---- 会话无效 (op=9) ----
      if (payload.op === GatewayOpcode.INVALID_SESSION) {
        this.log('WARN', '会话无效 (OP 9)，清除 session 并重新认证');
        this.sessionId = null;
        this.setState('reconnecting');
        if (this.ws) {
          this.ws.close(4002, 'Invalid session');
        }
        return;
      }

      // ---- Dispatch (op=0) ----
      if (payload.op === GatewayOpcode.DISPATCH) {
        this.handleDispatch(payload);
        return;
      }
    } catch (error) {
      this.log('WARN', `解析 Gateway 消息失败: ${error}`);
    }
  }

  private onClose(code: number, reason: Buffer): void {
    this.ws = null;
    this.clearTimers();
    const reasonStr = reason?.toString?.() || '';

    this.log('WARN', `WebSocket 已断开 code=${code}${reasonStr ? ` reason=${reasonStr}` : ''}`);

    if (this.intentionalClose) {
      this.intentionalClose = false;
      this.setState('disconnected');
      return;
    }

    this.setState('reconnecting');
    this.scheduleReconnect();
  }

  private onSocketError(error: Error): void {
    this.log('ERROR', `WebSocket 错误: ${error.message}`);
    this.callbacks.onError?.(error);

    // 关闭连接（触发 onClose，onClose 会处理重连）
    if (this.ws) {
      try {
        this.ws.close(4000, error.message);
      } catch {}
    }
  }

  // ==================== 协议处理 ====================

  private handleHello(data: GatewayHelloData): void {
    if (!data?.heartbeat_interval) {
      this.log('WARN', 'HELLO 缺少 heartbeat_interval，使用默认 45000ms');
      this.heartbeatInterval = 45000;
    } else {
      this.heartbeatInterval = Math.max(data.heartbeat_interval, 30000);
    }

    this.lastHeartbeatAckAt = Date.now();
    this.log('INFO', `收到 HELLO，心跳间隔 ${this.heartbeatInterval}ms`);

    // 决定是 Resume 还是 Identify
    if (this.sessionId && this.lastSeq !== null) {
      this.sendResume();
    } else {
      this.sendIdentify();
    }
  }

  private async sendIdentify(): Promise<void> {
    // 重新获取 token（可能是重连场景）
    const token = await fetchAccessToken(this.credentials, this.reconnectAttempts > 0);

    const identify: GatewayPayload<GatewayIdentifyData> = {
      op: GatewayOpcode.IDENTIFY,
      d: {
        token: `${QQ_AUTH_PREFIX} ${token}`,
        intents: this.intents,
        shard: this.shard,
        properties: {
          $os: 'linux',
          $browser: 'wawa-qqbot',
          $device: 'wawa-qqbot',
        },
      },
    };

    this.setState('identifying');
    this.send(identify);
    this.log('INFO', `已发送 IDENTIFY (intents=${this.intents})`);
  }

  private async sendResume(): Promise<void> {
    const token = await fetchAccessToken(this.credentials, true);

    const resume: GatewayPayload<GatewayResumeData> = {
      op: GatewayOpcode.RESUME,
      d: {
        token: `${QQ_AUTH_PREFIX} ${token}`,
        session_id: this.sessionId!,
        seq: this.lastSeq!,
      },
    };

    this.setState('resuming');
    this.send(resume);
    this.log('INFO', `已发送 RESUME (session=${this.sessionId}, seq=${this.lastSeq})`);
  }

  private handleDispatch(payload: GatewayPayload): void {
    const eventType = payload.t || '';

    // ---- READY 事件 ----
    if (eventType === 'READY') {
      const data = payload.d as unknown as GatewayReadyData;
      if (data?.session_id) {
        this.sessionId = data.session_id;
      }
      this.setState('connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.callbacks.onReady?.(data);
      this.log('INFO', `Gateway 就绪 (session=${this.sessionId}, user=${data?.user?.username || 'unknown'})`);
      return;
    }

    // ---- RESUMED 事件 ----
    if (eventType === 'RESUMED') {
      this.setState('connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.callbacks.onResumed?.();
      this.log('INFO', 'Gateway 会话已恢复');
      return;
    }

    // 其他事件交给回调处理
    this.callbacks.onEvent?.(payload);
  }

  // ==================== 心跳 ====================

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.state !== 'connected') return;

      // 检查 Heartbeat ACK 超时
      const now = Date.now();
      const staleThreshold = this.heartbeatInterval * 2 + 15000;
      if (this.lastHeartbeatAckAt > 0 && now - this.lastHeartbeatAckAt > staleThreshold) {
        this.log('WARN', `心跳 ACK 超时（>${staleThreshold}ms），主动重连`);
        this.setState('reconnecting');
        if (this.ws) {
          this.ws.close(4003, 'Heartbeat timeout');
        }
        return;
      }

      const beat: GatewayPayload<number | null> = {
        op: GatewayOpcode.HEARTBEAT,
        d: this.lastSeq,
      };
      this.send(beat);
    }, this.heartbeatInterval);

    // 心跳超时检测
    this.heartbeatTimeout = setTimeout(() => {
      if (this.state !== 'connected') return;
      this.log('WARN', '心跳 ACK 检测超时');
      this.setState('reconnecting');
      if (this.ws) {
        this.ws.close(4003, 'Heartbeat check timeout');
      }
    }, this.heartbeatInterval + 10000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  // ==================== 重连 ====================

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    const { maxDelay, baseDelay, maxAttempts, jitterEnabled } = this.reconnectConfig;

    if (maxAttempts > 0 && this.reconnectAttempts >= maxAttempts) {
      this.log('ERROR', `已达到最大重试次数 (${maxAttempts})，停止重连`);
      this.setState('disconnected');
      return;
    }

    this.reconnectAttempts++;
    // 指数退避：5s, 10s, 20s, 30s(max)
    let delay = Math.min(maxDelay, baseDelay * Math.pow(2, this.reconnectAttempts - 1));
    if (jitterEnabled) {
      delay = delay * (0.8 + Math.random() * 0.4);
    }

    this.log('WARN', `${Math.round(delay / 1000)}秒后重连 (第${this.reconnectAttempts}次)`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((err) => {
        this.log('ERROR', `重连失败: ${err}`);
      });
    }, delay);
  }

  // ==================== 工具方法 ====================

  private send(payload: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private setState(state: GatewayState): void {
    const prev = this.state;
    this.state = state;
    if (prev !== state) {
      this.callbacks.onStateChange?.(state);
    }
  }

  private clearTimers(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private log(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
    this.callbacks.onLog?.(level, message);
  }
}
