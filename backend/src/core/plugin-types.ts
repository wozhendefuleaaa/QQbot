import { Message } from '../types.js';

/**
 * 插件上下文 - 提供给插件的API接口
 */
export type PluginContext = {
  /** 发送消息到指定目标 */
  sendMessage: (targetId: string, targetType: 'user' | 'group', text: string) => Promise<void>;
  /** 记录日志 */
  log: (level: 'info' | 'warn' | 'error', message: string) => void;
  /** 获取当前连接的账号ID */
  getConnectedAccountId: () => string | null;
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
