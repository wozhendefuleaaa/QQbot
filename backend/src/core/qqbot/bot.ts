/**
 * QQBot 客户端核心类
 * 
 * 参考 qq-official-bot + OpenClaw 设计模式：
 * - Bot → Service → Client 多层架构
 * - 多账号隔离 (每个账号独立 Gateway + Token缓存)
 * - 回声循环防护 (跟踪出站消息引用)
 * - 消息管道 (入站队列 + 合并 + 优先级)
 * 
 * 用法：
 *   const bot = new QQBot({ appId, appSecret })
 *   bot.on('message.group', async (event) => {
 *     await event.reply('Hello!')
 *   })
 *   await bot.start()
 */

import { EventEmitter } from 'events';
import {
  BotCredentials,
  GatewayPayload,
  ParsedInboundEvent,
  SendMessageResponse,
  Intent,
  DEFAULT_INTENTS,
} from './types.js';
import { GatewayClient, GatewayCallbacks, GatewayState } from './gateway.js';
import { parseGatewayEvent } from './events.js';
import { sendTextMessage, sendMarkdownMessage, sendMessageWithFallback } from './messages.js';
import { MessageBuilder, SegmentType } from './segment.js';
import { parseApiError } from './errors.js';
import { clearTokenCache } from './auth.js';

// ==================== 事件类型 ====================

export type BotEventType =
  | 'message'
  | 'message.group'
  | 'message.private'
  | 'message.channel'
  | 'ready'
  | 'resumed'
  | 'state_change'
  | 'error'
  | 'friend_add'
  | 'group_join'
  | 'group_leave'
  | 'interaction';

// ==================== Bot 消息事件 ====================

export class BotMessageEvent {
  /** 原始解析结果 */
  readonly parsed: ParsedInboundEvent;
  /** 所属 Bot 实例 */
  readonly bot: QQBot;
  /** 消息构建器 (用于回复) */
  private _replyBuilder?: MessageBuilder;

  constructor(parsed: ParsedInboundEvent, bot: QQBot) {
    this.parsed = parsed;
    this.bot = bot;
  }

  get messageId(): string | undefined {
    return this.parsed.inboundMsgId;
  }
  get content(): string {
    return this.parsed.content;
  }
  get peerId(): string {
    return this.parsed.peerId;
  }
  get peerName(): string {
    return this.parsed.peerName;
  }
  get peerType(): 'user' | 'group' | 'channel' {
    return this.parsed.peerType;
  }
  get isGroup(): boolean {
    return this.parsed.peerType === 'group';
  }
  get isPrivate(): boolean {
    return this.parsed.peerType === 'user';
  }

  /** 获取原始事件数据 */
  getRawPayload(): unknown {
    return this.parsed.rawPayload;
  }

  /** 快速文本回复 (自动处理 msg_id 过期) */
  async reply(text: string): Promise<SendMessageResponse | null> {
    return this.bot.sendReply(this, text);
  }

  /** 使用 MessageBuilder 回复 */
  async replyWith(builder: MessageBuilder): Promise<SendMessageResponse | null> {
    return this.bot.sendReplyWith(this, builder);
  }

  /** 快速 Markdown 回复 */
  async replyMarkdown(
    markdown: import('./types.js').MarkdownPayload
  ): Promise<SendMessageResponse | null> {
    return this.bot.sendReplyMarkdown(this, markdown);
  }
}

// ==================== Bot 账户 ====================

export interface BotAccount {
  id: string;
  name: string;
  credentials: BotCredentials;
  /** 订阅的 intents */
  intents?: number;
  /** 代理标识 (可选) */
  label?: string;
}

// ==================== Bot 配置 ====================

export interface QQBotOptions {
  /** 账户列表 */
  accounts: BotAccount[];
  /** 默认 intents */
  defaultIntents?: number;
  /** 是否启用回声循环防护 */
  echoLoopPrevention?: boolean;
  /** 日志函数 */
  log?: (level: 'INFO' | 'WARN' | 'ERROR', message: string) => void;
}

// ==================== QQBot 主类 ====================

export class QQBot extends EventEmitter {
  // ---- 配置 ----
  private accounts: Map<string, BotAccount> = new Map();
  private defaultIntents: number;
  private echoLoopPrevention: boolean;

  // ---- 运行时 ----
  /** Map<accountId, GatewayClient> */
  private gateways = new Map<string, GatewayClient>();
  /** 回声防护: Set<"accountId:msgId"> 记录最近发出的消息ID */
  private recentOutboundIds = new Set<string>();
  /** 回声防护窗口: 10 分钟 */
  private readonly echoWindowMs = 10 * 60 * 1000;

  // ---- 消息管道 ----
  /** Map<"accountId:peerId", Promise队列> */
  private peerQueues = new Map<string, Promise<void>>();

  private log: (level: 'INFO' | 'WARN' | 'ERROR', message: string) => void;

  constructor(options: QQBotOptions) {
    super();
    for (const acc of options.accounts) {
      this.accounts.set(acc.id, acc);
    }
    this.defaultIntents =
      options.defaultIntents ||
      DEFAULT_INTENTS |
        Intent.GROUP_AND_C2C_EVENT |
        Intent.INTERACTION;
    this.echoLoopPrevention = options.echoLoopPrevention !== false;
    this.log = options.log || ((_l, _m) => {});
  }

  // ==================== 类型化事件监听 ====================

  on(event: 'message', listener: (event: BotMessageEvent) => void): this;
  on(event: 'message.group', listener: (event: BotMessageEvent) => void): this;
  on(event: 'message.private', listener: (event: BotMessageEvent) => void): this;
  on(event: 'message.channel', listener: (event: BotMessageEvent) => void): this;
  on(event: 'ready', listener: (accountId: string) => void): this;
  on(event: 'resumed', listener: (accountId: string) => void): this;
  on(event: 'state_change', listener: (accountId: string, state: GatewayState) => void): this;
  on(event: 'error', listener: (accountId: string, error: Error) => void): this;
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  // ==================== 生命周期 ====================

  /** 启动所有账号 */
  async start(): Promise<void> {
    for (const [id, account] of this.accounts) {
      this.log('INFO', `QQBot: 启动账号 "${account.name}" (${id})`);
      const gw = this.createGateway(account);
      this.gateways.set(id, gw);
      await gw.connect();
    }
  }

  /** 停止所有账号 */
  async stop(): Promise<void> {
    for (const [id, gw] of this.gateways) {
      clearTokenCache(id);
      gw.disconnect();
    }
    this.gateways.clear();
    this.accounts.clear();
    this.peerQueues.clear();
    this.recentOutboundIds.clear();
  }

  /** 启动单个账号 */
  async startAccount(accountId: string): Promise<void> {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`账号 ${accountId} 不存在`);
    if (this.gateways.has(accountId)) return;
    const gw = this.createGateway(account);
    this.gateways.set(accountId, gw);
    await gw.connect();
  }

  /** 停止单个账号 */
  async stopAccount(accountId: string): Promise<void> {
    const gw = this.gateways.get(accountId);
    if (gw) {
      gw.disconnect();
      this.gateways.delete(accountId);
      clearTokenCache(accountId);
    }
  }

  /** 获取账号连接状态 */
  getAccountState(accountId: string): GatewayState | null {
    return this.gateways.get(accountId)?.getState() || null;
  }

  /** 是否已连接 */
  isConnected(accountId: string): boolean {
    return this.getAccountState(accountId) === 'connected';
  }

  // ==================== 消息发送 ====================

  /** 发送文本消息 */
  async sendText(
    accountId: string,
    targetId: string,
    text: string,
    targetType: 'user' | 'group' = 'user',
    replyMsgId?: string
  ): Promise<SendMessageResponse | null> {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`账号 ${accountId} 不存在`);

    const result = await sendMessageWithFallback(
      account.credentials,
      targetId,
      targetType,
      text,
      replyMsgId
    );

    this.trackOutbound(accountId, result.id);
    return result;
  }

  /** 使用 MessageBuilder 发送 */
  async sendMessage(
    accountId: string,
    targetId: string,
    targetType: 'user' | 'group',
    builder: MessageBuilder
  ): Promise<SendMessageResponse | null> {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`账号 ${accountId} 不存在`);

    const request = builder.build();

    // 使用 SDK 的底层函数发送
    let result: SendMessageResponse;
    if (request.msg_type === 2) {
      // Markdown
      result = await sendMarkdownMessage(
        account.credentials,
        targetId,
        request.markdown!,
        request.msg_id,
        targetType
      );
    } else if (request.msg_type === 7) {
      // 媒体
      const { sendMediaMessage } = await import('./messages.js');
      result = await sendMediaMessage(
        account.credentials,
        targetId,
        request.media!.file_info,
        targetType
      );
    } else {
      // 文本 (可能带 keyboard)
      result = await sendMessageWithFallback(
        account.credentials,
        targetId,
        targetType,
        request.content || '',
        request.msg_id
      );
    }

    this.trackOutbound(accountId, result.id);
    return result;
  }

  /** 回复消息事件 */
  async sendReply(
    event: BotMessageEvent,
    text: string
  ): Promise<SendMessageResponse | null> {
    if (!this.beforeReply(event)) return null;

    const account = this.getAccountByEvent(event);
    return this.sendText(
      account?.id || '',
      event.parsed.peerOpenId || event.parsed.peerId,
      text,
      (event.parsed.peerType === 'channel' ? 'group' : event.parsed.peerType),
      event.parsed.inboundMsgId
    );
  }

  /** 使用构建器回复 */
  async sendReplyWith(
    event: BotMessageEvent,
    builder: MessageBuilder
  ): Promise<SendMessageResponse | null> {
    if (!this.beforeReply(event)) return null;

    const account = this.getAccountByEvent(event);
    if (!account) return null;

    // 如果有 inboundMsgId，添加 reply
    if (event.parsed.inboundMsgId) {
      builder.reply(event.parsed.inboundMsgId);
    }

    return this.sendMessage(
      account.id,
      event.parsed.peerOpenId || event.parsed.peerId,
      event.parsed.peerType === 'channel' ? 'group' : event.parsed.peerType as 'user' | 'group',
      builder
    );
  }

  /** 回复 Markdown 消息 */
  async sendReplyMarkdown(
    event: BotMessageEvent,
    markdown: import('./types.js').MarkdownPayload
  ): Promise<SendMessageResponse | null> {
    if (!this.beforeReply(event)) return null;

    const account = this.getAccountByEvent(event);
    if (!account) return null;

    return sendMarkdownMessage(
      account.credentials,
      event.parsed.peerOpenId || event.parsed.peerId,
      markdown,
      event.parsed.inboundMsgId,
      event.parsed.peerType === 'channel' ? 'group' : event.parsed.peerType
    );
  }

  // ==================== 内部实现 ====================

  private createGateway(account: BotAccount): GatewayClient {
    const callbacks: GatewayCallbacks = {
      onEvent: (payload: GatewayPayload) =>
        this.handleGatewayEvent(account.id, payload),
      onReady: () => {
        this.log('INFO', `QQBot: 账号 "${account.name}" Gateway 就绪`);
        this.emit('ready', account.id);
      },
      onResumed: () => {
        this.log('INFO', `QQBot: 账号 "${account.name}" Gateway 会话恢复`);
        this.emit('resumed', account.id);
      },
      onStateChange: (state) => {
        this.emit('state_change', account.id, state);
      },
      onError: (error) => {
        this.log('ERROR', `QQBot: 账号 "${account.name}" 错误: ${error.message}`);
        this.emit('error', account.id, error);
      },
      onLog: (level, msg) => {
        this.log(level, `[${account.name}] ${msg}`);
      },
    };

    return new GatewayClient(account.credentials, {
      intents: account.intents || this.defaultIntents,
      callbacks,
    });
  }

  /** 处理 Gateway 事件 → 解析 → 管道入队 → 触发 */
  private async handleGatewayEvent(
    accountId: string,
    payload: GatewayPayload
  ): Promise<void> {
    // 非 Dispatch 事件跳过
    if (!payload.t) return;

    const parsed = parseGatewayEvent(payload);
    if (!parsed || !parsed.shouldRecord) return;

    // 回声循环防护
    if (this.echoLoopPrevention && parsed.eventType.includes('MESSAGE')) {
      const echoKey = `${accountId}:${parsed.inboundMsgId || parsed.content.slice(0, 50)}`;
      if (this.recentOutboundIds.has(echoKey)) {
        return; // 忽略自己的回声
      }
    }

    const event = new BotMessageEvent(parsed, this);

    // 消息管道：同一 peer 的消息串行处理
    const peerKey = `${accountId}:${parsed.peerId}`;
    const prev = this.peerQueues.get(peerKey) || Promise.resolve();

    const current = prev.then(async () => {
      // 触发通用事件
      this.emit('message', event);

      // 触发分类事件
      if (parsed.peerType === 'group') {
        this.emit('message.group', event);
      } else if (parsed.peerType === 'user') {
        this.emit('message.private', event);
      } else if (parsed.peerType === 'channel') {
        this.emit('message.channel', event);
      }

      // 触发好友添加
      if (parsed.eventType === 'FRIEND_ADD') {
        this.emit('friend_add', event);
      }

      // 触发群机器人事件
      if (parsed.eventType === 'GROUP_ADD_ROBOT') {
        this.emit('group_join', event);
      }
      if (parsed.eventType === 'GROUP_DEL_ROBOT') {
        this.emit('group_leave', event);
      }

      // 触发互动事件
      if (parsed.eventType === 'INTERACTION_CREATE') {
        this.emit('interaction', event);
      }
    });

    this.peerQueues.set(peerKey, current);

    // 定期清理空闲队列
    current.finally(() => {
      setTimeout(() => {
        if (this.peerQueues.get(peerKey) === current) {
          this.peerQueues.delete(peerKey);
        }
      }, 30000);
    });
  }

  /** 回声防护：记录出站消息 */
  private trackOutbound(accountId: string, msgId: string): void {
    const key = `${accountId}:${msgId}`;
    this.recentOutboundIds.add(key);
    setTimeout(() => {
      this.recentOutboundIds.delete(key);
    }, this.echoWindowMs);

    // 限制集合大小
    if (this.recentOutboundIds.size > 1000) {
      const iter = this.recentOutboundIds.values();
      for (let i = 0; i < 200; i++) {
        const item = iter.next();
        if (item.done || !item.value) break;
        this.recentOutboundIds.delete(item.value);
      }
    }
  }

  /** 回复前的检查 */
  private beforeReply(event: BotMessageEvent): boolean {
    const account = this.getAccountByEvent(event);
    if (!account) {
      this.log('WARN', `[${event.parsed.peerName}] 找不到对应账号，无法回复`);
      return false;
    }
    if (!this.isConnected(account.id)) {
      this.log('WARN', `[${event.parsed.peerName}] 账号 ${account.name} 未连接，无法回复`);
      return false;
    }
    return true;
  }

  /** 根据事件查找对应账号 */
  getAccountByEvent(event: BotMessageEvent): BotAccount | undefined {
    for (const [, acc] of this.accounts) {
      const gw = this.gateways.get(acc.id);
      if (gw && gw.getState() === 'connected') {
        return acc;
      }
    }
    // 回退：返回第一个账号
    return this.accounts.values().next().value;
  }
}
