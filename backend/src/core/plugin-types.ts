import { Message } from '../types.js';
import type { MarkdownPayload, ArkPayload, EmbedPayload, KeyboardPayload } from './qqbot/types.js';

/**
 * 插件上下文 - 提供给插件的API接口
 */
export type PluginContext = {
  /** 发送文本消息到指定目标 */
  sendMessage: (targetId: string, targetType: 'user' | 'group', text: string) => Promise<void>;

  /** 
   * 发送富文本消息 (支持 MessageBuilder 链式构建)
   * 
   * @example
   * ctx.sendRichMessage(targetId, targetType, b => b.text('Hello ').at(userId))
   */
  sendRichMessage: (
    targetId: string,
    targetType: 'user' | 'group',
    builder: (b: unknown) => unknown
  ) => Promise<void>;

  /** 发送 Markdown 消息 */
  sendMarkdown: (
    targetId: string,
    targetType: 'user' | 'group',
    markdown: MarkdownPayload
  ) => Promise<void>;

  /** 发送键盘按钮消息（可附带文本） */
  sendKeyboard: (
    targetId: string,
    targetType: 'user' | 'group',
    keyboard: KeyboardPayload,
    content?: string
  ) => Promise<void>;

  /** 发送 Markdown + 键盘组合消息 */
  sendMarkdownKeyboard: (
    targetId: string,
    targetType: 'user' | 'group',
    markdown: MarkdownPayload,
    keyboard: KeyboardPayload
  ) => Promise<void>;

  /** 
   * 回复消息（自动处理 msg_id）
   * 会自动引用原始消息进行回复
   */
  reply: (text: string) => Promise<void>;

  /** 记录日志 */
  log: (level: 'info' | 'warn' | 'error', message: string) => void;

  /** 获取当前连接的账号ID */
  getConnectedAccountId: () => string | null;

  /** 获取原始消息事件 */
  getMessageEvent: () => MessageEvent;
};

/**
 * 消息事件数据
 */
export type MessageEvent = {
  message: Message;
  /** 是否为群消息 */
  isGroup: boolean;
  /** 发送者ID */
  senderId: string;
  /** 发送者名称 */
  senderName?: string;
  /** 群ID（如果是群消息） */
  groupId?: string;
};

/**
 * 命令权限级别
 */
export type CommandPermission = 'public' | 'admin' | 'owner';

/**
 * 命令定义
 */
export type CommandDefinition = {
  /** 命令名称（不含前缀） */
  name: string;
  /** 命令别名 */
  aliases?: string[];
  /** 命令描述 */
  description: string;
  /** 使用示例 */
  usage?: string;
  /** 参数模式（正则或描述） */
  pattern?: string;
  /** 权限级别 */
  permission?: CommandPermission;
  /** 冷却时间（秒） */
  cooldown?: number;
  /** 是否在帮助中隐藏 */
  hidden?: boolean;
  /** 处理函数 */
  handler: (args: string[], event: MessageEvent, ctx: PluginContext) => Promise<string | void>;
};

/**
 * 插件接口
 */
export type Plugin = {
  /** 插件ID */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version: string;
  /** 插件描述 */
  description: string;
  /** 插件作者 */
  author?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 插件优先级（数字越小越先执行） */
  priority?: number;

  /** 生命周期：插件加载时调用 */
  onLoad?: (ctx: PluginContext) => Promise<void> | void;
  /** 生命周期：插件卸载时调用 */
  onUnload?: () => Promise<void> | void;

  /** 消息处理器 - 接收到消息时调用 */
  onMessage?: (event: MessageEvent, ctx: PluginContext) => Promise<boolean | void>;

  /** 命令列表 */
  commands?: CommandDefinition[];

  /** 定时任务 */
  cronJobs?: {
    pattern: string;
    handler: (ctx: PluginContext) => Promise<void> | void;
  }[];

  /** 云崽事件处理器 */
  eventHandlers?: {
    event: string;
    handler: (event: MessageEvent, ctx: PluginContext) => Promise<boolean | void>;
  }[];

  /** 清理回调，用于移除运行时注册内容 */
  dispose?: () => Promise<void> | void;
};

/**
 * 插件配置
 */
export type PluginConfig = {
  /** 命令前缀 */
  commandPrefix: string;
  /** 是否允许群消息 */
  allowGroup: boolean;
  /** 是否允许私聊 */
  allowPrivate: boolean;
  /** 管理员用户ID列表 */
  adminUserIds: string[];
  /** 机器人所有者ID列表 */
  ownerIds?: string[];
};
