/**
 * 云崽插件适配层
 * 模拟云崽核心API，使云崽插件可以直接运行
 */

import { Plugin, PluginContext, MessageEvent } from './plugin-types.js';
import { addSystemLog, appConfig } from './store.js';

// ==================== Segment 消息构建器 ====================

/**
 * 消息段类型 - 模拟云崽的 segment
 */
export type SegmentType = 
  | { type: 'text'; text: string }
  | { type: 'image'; file: string; url?: string }
  | { type: 'at'; qq: string; name?: string }
  | { type: 'reply'; id: string }
  | { type: 'face'; id: number }
  | { type: 'record'; file: string }
  | { type: 'video'; file: string }
  | { type: 'json'; data: string }
  | { type: 'xml'; data: string }
  | { type: 'poke'; id: number }
  | { type: 'forward'; id: string };

/**
 * segment 消息构建器
 * 模拟云崽的 segment API
 */
export const segment = {
  text: (text: string): SegmentType => ({ type: 'text', text }),
  
  image: (file: string): SegmentType => ({ type: 'image', file }),
  
  at: (qq: string | number, name?: string): SegmentType => ({ 
    type: 'at', 
    qq: String(qq),
    name 
  }),
  
  reply: (id: string | number): SegmentType => ({ 
    type: 'reply', 
    id: String(id) 
  }),
  
  face: (id: number): SegmentType => ({ type: 'face', id }),
  
  record: (file: string): SegmentType => ({ type: 'record', file }),
  
  video: (file: string): SegmentType => ({ type: 'video', file }),
  
  json: (data: string): SegmentType => ({ type: 'json', data }),
  
  xml: (data: string): SegmentType => ({ type: 'xml', data }),
  
  poke: (id: number): SegmentType => ({ type: 'poke', id }),
  
  forward: (id: string): SegmentType => ({ type: 'forward', id })
};

// ==================== 云崽事件对象 ====================

/**
 * 云崽消息事件对象
 * 模拟云崽的 e 对象
 */
export interface YunzaiEvent {
  /** 消息ID */
  message_id: string;
  /** 消息原始内容 */
  raw_message: string;
  /** 消息内容 */
  msg: string;
  /** 消息文本 */
  message: string;
  /** 消息段数组 */
  segments?: SegmentType[];
  
  /** 发送者信息 */
  user_id: string;
  sender: {
    user_id: string;
    nickname: string;
    card?: string;
    sex?: string;
    age?: number;
    area?: string;
    level?: string;
    role?: 'owner' | 'admin' | 'member';
  };
  
  /** 群信息 */
  group_id?: string;
  group_name?: string;
  group?: {
    group_id: string;
    group_name: string;
    member_count?: number;
  };
  
  /** 是否是群消息 */
  isGroup: boolean;
  /** 是否是私聊消息 */
  isPrivate: boolean;
  
  /** 是否@机器人 */
  atBot?: boolean;
  /** @成员列表 */
  atUser?: string[];
  
  /** 原始事件数据 */
  originalEvent?: MessageEvent;
  
  /** 回复消息 */
  reply: (message: string | SegmentType | SegmentType[], quote?: boolean) => Promise<void>;
  
  /** 发送消息 */
  replyMsg: (message: string | SegmentType | SegmentType[]) => Promise<void>;
  
  /** 获取@成员 */
  getAtUser: () => string[];
  
  /** 是否有@ */
  hasAt: () => boolean;
  
  /** 检查是否@了指定用户 */
  isAt: (userId: string) => boolean;
}

/**
 * 创建云崽事件对象
 */
export function createYunzaiEvent(
  event: MessageEvent, 
  ctx: PluginContext,
  replyInfo: { targetId: string; targetType: 'user' | 'group'; msgId?: string }
): YunzaiEvent {
  const isGroup = event.isGroup;
  const messageText = event.message.text;
  
  // 解析@成员
  const atMatches = messageText.match(/<at\s+qq=["']?(\d+)["']?\s*\/?>/g) || [];
  const atUser = atMatches.map(m => {
    const idMatch = m.match(/qq=["']?(\d+)/);
    return idMatch ? idMatch[1] : '';
  }).filter(Boolean);
  
  // 检查是否@机器人
  const connectedAccountId = ctx.getConnectedAccountId();
  const atBot = connectedAccountId ? atUser.includes(connectedAccountId) : false;
  
  const yunzaiEvent: YunzaiEvent = {
    message_id: event.message.id,
    raw_message: messageText,
    msg: messageText,
    message: messageText,
    
    user_id: event.senderId,
    sender: {
      user_id: event.senderId,
      nickname: event.senderName || '未知用户',
      card: event.senderName,
      role: 'member'
    },
    
    group_id: isGroup ? event.groupId : undefined,
    group_name: isGroup ? event.groupId : undefined,
    group: isGroup ? {
      group_id: event.groupId!,
      group_name: event.groupId!
    } : undefined,
    
    isGroup,
    isPrivate: !isGroup,
    
    atBot,
    atUser,
    
    originalEvent: event,
    
    reply: async (message: string | SegmentType | SegmentType[], quote = false) => {
      const text = segmentToText(message);
      const msgId = quote ? event.message.id : undefined;
      await ctx.sendMessage(
        replyInfo.targetId, 
        replyInfo.targetType, 
        text,
      );
    },
    
    replyMsg: async (message: string | SegmentType | SegmentType[]) => {
      const text = segmentToText(message);
      await ctx.sendMessage(replyInfo.targetId, replyInfo.targetType, text);
    },
    
    getAtUser: () => atUser,
    
    hasAt: () => atUser.length > 0,
    
    isAt: (userId: string) => atUser.includes(userId)
  };
  
  return yunzaiEvent;
}

/**
 * 将消息段转换为文本
 */
function segmentToText(message: string | SegmentType | SegmentType[]): string {
  if (typeof message === 'string') {
    return message;
  }
  
  if (Array.isArray(message)) {
    return message.map(seg => segmentToString(seg)).join('');
  }
  
  return segmentToString(message);
}

/**
 * 单个消息段转字符串
 */
function segmentToString(seg: SegmentType): string {
  switch (seg.type) {
    case 'text':
      return seg.text;
    case 'image':
      return `[图片:${seg.file}]`;
    case 'at':
      return seg.name ? `@${seg.name}` : `@${seg.qq}`;
    case 'reply':
      return `[回复:${seg.id}]`;
    case 'face':
      return `[表情:${seg.id}]`;
    case 'record':
      return `[语音]`;
    case 'video':
      return `[视频]`;
    case 'json':
      return `[JSON消息]`;
    case 'xml':
      return `[XML消息]`;
    case 'poke':
      return `[戳一戳]`;
    case 'forward':
      return `[转发消息]`;
    default:
      return '';
  }
}

// ==================== 云崽插件基类 ====================

/**
 * 云崽插件基类
 * 模拟云崽的 plugin 类
 */
export class YunzaiPlugin {
  /** 插件名称 */
  name: string = '';
  /** 插件描述 */
  dsc: string = '';
  /** 事件类型 */
  event: string = 'message';
  /** 优先级 */
  priority: number = 1000;
  /** 规则列表 */
  rule: YunzaiRule[] = [];
  /** 任务列表 */
  task?: YunzaiTask | YunzaiTask[];
  /** 是否启用 */
  enable: boolean = true;
  
  constructor() {
    // 子类可以覆盖
  }
  
  /**
   * 接受消息处理
   */
  accept?(e: YunzaiEvent): boolean | Promise<boolean>;
}

/**
 * 云崽规则定义
 */
export interface YunzaiRule {
  /** 正则匹配 */
  reg?: string | RegExp;
  /** 是否@机器人 */
  atBot?: boolean;
  /** 命令前缀 */
  prefix?: boolean | string[];
  /** 处理函数名 */
  fnc: string;
  /** 权限: master(仅主人) | admin(管理员) | all(所有人) */
  permission?: 'master' | 'admin' | 'all';
  /** 描述 */
  describe?: string;
}

/**
 * 权限配置接口
 */
export interface YunzaiPermissionConfig {
  /** 主人ID列表（最高权限） */
  masterIds: string[];
  /** 管理员ID列表 */
  adminIds: string[];
}

// 全局权限配置
let permissionConfig: YunzaiPermissionConfig = {
  masterIds: [],
  adminIds: []
};

/**
 * 设置权限配置
 */
export function setPermissionConfig(config: Partial<YunzaiPermissionConfig>): void {
  if (config.masterIds) {
    permissionConfig.masterIds = config.masterIds;
  }
  if (config.adminIds) {
    permissionConfig.adminIds = config.adminIds;
  }
}

/**
 * 获取当前权限配置
 */
export function getPermissionConfig(): YunzaiPermissionConfig {
  return { ...permissionConfig };
}

/**
 * 添加主人
 */
export function addMaster(userId: string): void {
  if (!permissionConfig.masterIds.includes(userId)) {
    permissionConfig.masterIds.push(userId);
  }
}

/**
 * 移除主人
 */
export function removeMaster(userId: string): void {
  permissionConfig.masterIds = permissionConfig.masterIds.filter(id => id !== userId);
}

/**
 * 添加管理员
 */
export function addAdmin(userId: string): void {
  if (!permissionConfig.adminIds.includes(userId)) {
    permissionConfig.adminIds.push(userId);
  }
}

/**
 * 移除管理员
 */
export function removeAdmin(userId: string): void {
  permissionConfig.adminIds = permissionConfig.adminIds.filter(id => id !== userId);
}

/**
 * 检查是否是主人
 */
export function isMaster(userId: string): boolean {
  return permissionConfig.masterIds.includes(userId);
}

/**
 * 检查是否是管理员（包括主人）
 */
export function isAdmin(userId: string): boolean {
  return permissionConfig.masterIds.includes(userId) ||
         permissionConfig.adminIds.includes(userId);
}

/**
 * 云崽定时任务
 */
export interface YunzaiTask {
  /** cron表达式 */
  cron?: string;
  /** 任务名称 */
  name: string;
  /** 处理函数名 */
  fnc: string;
  /** 是否启用 */
  enable?: boolean;
  /** 日志 */
  log?: boolean;
}

// ==================== 云崽插件转换器 ====================

/**
 * 将云崽插件转换为内部插件格式
 */
export function convertYunzaiPlugin(yunzaiPlugin: YunzaiPlugin, pluginId?: string): Plugin {
  const id = pluginId || yunzaiPlugin.name || `yunzai-${Date.now()}`;
  
  const plugin: Plugin = {
    id,
    name: yunzaiPlugin.name || '未命名云崽插件',
    version: '1.0.0',
    description: yunzaiPlugin.dsc || '云崽插件',
    enabled: yunzaiPlugin.enable !== false,
    priority: yunzaiPlugin.priority,
    
    onMessage: async (event: MessageEvent, ctx: PluginContext) => {
      // 创建云崽事件对象
      const replyInfo: { targetId: string; targetType: 'user' | 'group'; msgId?: string } = {
        targetId: event.isGroup ? (event.groupId || '') : event.senderId,
        targetType: event.isGroup ? 'group' : 'user',
        msgId: event.message.id
      };
      const yunzaiEvent = createYunzaiEvent(event, ctx, replyInfo);
      
      addSystemLog('INFO', 'plugin', `[云崽] ${yunzaiPlugin.name} 收到消息: "${event.message.text}" 规则数: ${yunzaiPlugin.rule?.length || 0}`);
      
      // 调用 accept 方法
      if (yunzaiPlugin.accept) {
        const accepted = await yunzaiPlugin.accept(yunzaiEvent);
        if (accepted === true) {
          return true;
        }
      }
      
      // 处理规则匹配
      if (yunzaiPlugin.rule && yunzaiPlugin.rule.length > 0) {
        for (const rule of yunzaiPlugin.rule) {
          addSystemLog('INFO', 'plugin', `[云崽] ${yunzaiPlugin.name} 检查规则: reg=${rule.reg} fnc=${rule.fnc}`);
          if (await matchRule(rule, yunzaiEvent, yunzaiPlugin)) {
            return true;
          }
        }
      }
      
      return false;
    }
  };
  
  return plugin;
}

/**
 * 检查云崽权限
 * @param permission 权限级别: master | admin | all
 * @param userId 用户ID
 * @returns 是否有权限
 */
function checkYunzaiPermission(
  permission: 'master' | 'admin' | 'all',
  userId: string
): boolean {
  // all 权限：所有人都可以使用
  if (permission === 'all') {
    return true;
  }
  
  // 获取权限配置
  const masterIds = getMasterIds();
  const adminIds = getAdminIds();
  
  // master 权限：只有主人可以使用
  if (permission === 'master') {
    return masterIds.includes(userId);
  }
  
  // admin 权限：管理员和主人都可以使用
  if (permission === 'admin') {
    return masterIds.includes(userId) || adminIds.includes(userId);
  }
  
  return true;
}

/**
 * 获取主人ID列表
 */
function getMasterIds(): string[] {
  // 优先使用 appConfig 中的配置
  if (appConfig.yunzaiPermission?.masterIds?.length > 0) {
    return appConfig.yunzaiPermission.masterIds;
  }
  // 其次使用全局配置
  if (permissionConfig.masterIds.length > 0) {
    return permissionConfig.masterIds;
  }
  // 从环境变量获取，支持多个主人（逗号分隔）
  const masterEnv = process.env.YUNZAI_MASTER_IDS || process.env.MASTER_IDS || '';
  if (masterEnv) {
    const ids = masterEnv.split(',').map(id => id.trim()).filter(Boolean);
    // 同步到全局配置
    permissionConfig.masterIds = ids;
    return ids;
  }
  return [];
}

/**
 * 获取管理员ID列表
 */
function getAdminIds(): string[] {
  // 优先使用 appConfig 中的配置
  if (appConfig.yunzaiPermission?.adminIds?.length > 0) {
    return appConfig.yunzaiPermission.adminIds;
  }
  // 其次使用全局配置
  if (permissionConfig.adminIds.length > 0) {
    return permissionConfig.adminIds;
  }
  // 从环境变量获取，支持多个管理员（逗号分隔）
  const adminEnv = process.env.YUNZAI_ADMIN_IDS || process.env.ADMIN_IDS || '';
  if (adminEnv) {
    const ids = adminEnv.split(',').map(id => id.trim()).filter(Boolean);
    // 同步到全局配置
    permissionConfig.adminIds = ids;
    return ids;
  }
  return [];
}

/**
 * 匹配规则并执行处理函数
 */
async function matchRule(
  rule: YunzaiRule,
  e: YunzaiEvent,
  plugin: YunzaiPlugin
): Promise<boolean> {
  const message = e.message;
  
  // 检查@机器人
  if (rule.atBot && !e.atBot) {
    return false;
  }
  
  // 检查权限
  const permission = rule.permission || 'all';
  if (!checkYunzaiPermission(permission, e.user_id)) {
    // 无权限时发送提示
    const permMsg = permission === 'master' ? '此命令仅主人可用' : '此命令仅管理员可用';
    await e.reply(`⚠️ ${permMsg}`);
    return true; // 拦截消息，不继续处理
  }
  
  // 检查正则匹配
  if (rule.reg) {
    const regex = typeof rule.reg === 'string' ? new RegExp(rule.reg) : rule.reg;
    if (!regex.test(message)) {
      return false;
    }
  }
  
  // 执行处理函数
  const handler = (plugin as any)[rule.fnc];
  if (typeof handler === 'function') {
    try {
      const result = await handler.call(plugin, e);
      return result !== false;
    } catch (error) {
      addSystemLog('ERROR', 'plugin', `云崽插件规则处理失败: ${plugin.name}.${rule.fnc} - ${error}`);
      return false;
    }
  }
  
  return false;
}

// ==================== 云崽 Bot 对象模拟 ====================

/**
 * 云崽 Bot 对象
 * 模拟云崽的 Bot API
 */
export interface YunzaiBot {
  /** Bot ID */
  uin: string;
  /** Bot 昵称 */
  nickname: string;
  
  /** 发送私聊消息 */
  sendPrivateMsg: (userId: string, message: string | SegmentType[]) => Promise<{ message_id: string }>;
  
  /** 发送群消息 */
  sendGroupMsg: (groupId: string, message: string | SegmentType[]) => Promise<{ message_id: string }>;
  
  /** 发送消息（自动判断私聊/群聊） */
  sendMsg: (targetId: string, message: string | SegmentType[], isGroup: boolean) => Promise<{ message_id: string }>;
  
  /** 获取群成员列表 */
  getGroupMemberList: (groupId: string) => Promise<any[]>;
  
  /** 获取群信息 */
  getGroupInfo: (groupId: string) => Promise<any>;
  
  /** 获取好友列表 */
  getFriendList: () => Promise<any[]>;
  
  /** 撤回消息 */
  deleteMsg: (messageId: string) => Promise<void>;
  
  /** 群禁言 */
  setGroupBan: (groupId: string, userId: string, duration: number) => Promise<void>;
  
  /** 群踢人 */
  setGroupKick: (groupId: string, userId: string) => Promise<void>;
}

/**
 * 创建云崽 Bot 对象
 */
export function createYunzaiBot(ctx: PluginContext): YunzaiBot {
  const accountId = ctx.getConnectedAccountId() || '';
  
  return {
    uin: accountId,
    nickname: 'Bot',
    
    sendPrivateMsg: async (userId: string, message: string | SegmentType[]) => {
      const text = segmentToText(message);
      await ctx.sendMessage(userId, 'user', text);
      return { message_id: `msg-${Date.now()}` };
    },
    
    sendGroupMsg: async (groupId: string, message: string | SegmentType[]) => {
      const text = segmentToText(message);
      await ctx.sendMessage(groupId, 'group', text);
      return { message_id: `msg-${Date.now()}` };
    },
    
    sendMsg: async (targetId: string, message: string | SegmentType[], isGroup: boolean) => {
      const text = segmentToText(message);
      await ctx.sendMessage(targetId, isGroup ? 'group' : 'user', text);
      return { message_id: `msg-${Date.now()}` };
    },
    
    getGroupMemberList: async (_groupId: string) => {
      // TODO: 实现获取群成员列表
      return [];
    },
    
    getGroupInfo: async (_groupId: string) => {
      // TODO: 实现获取群信息
      return null;
    },
    
    getFriendList: async () => {
      // TODO: 实现获取好友列表
      return [];
    },
    
    deleteMsg: async (_messageId: string) => {
      // TODO: 实现撤回消息
    },
    
    setGroupBan: async (_groupId: string, _userId: string, _duration: number) => {
      // TODO: 实现群禁言
    },
    
    setGroupKick: async (_groupId: string, _userId: string) => {
      // TODO: 实现群踢人
    }
  };
}

// ==================== 全局对象注入 ====================

/**
 * 初始化云崽全局对象
 * 在插件运行环境中注入 Bot、segment 等对象
 */
export function initYunzaiGlobals(ctx: PluginContext): void {
  // 注入 segment 到全局
  (global as any).segment = segment;
  
  // 注入 Bot 到全局
  (global as any).Bot = createYunzaiBot(ctx);
  
  // 注入 logger
  (global as any).logger = {
    info: (...args: any[]) => ctx.log('info', args.join(' ')),
    warn: (...args: any[]) => ctx.log('warn', args.join(' ')),
    error: (...args: any[]) => ctx.log('error', args.join(' ')),
    debug: (...args: any[]) => ctx.log('info', `[DEBUG] ${args.join(' ')}`),
    mark: (...args: any[]) => ctx.log('info', `[MARK] ${args.join(' ')}`),
    trace: (...args: any[]) => ctx.log('info', `[TRACE] ${args.join(' ')}`),
    fatal: (...args: any[]) => ctx.log('error', `[FATAL] ${args.join(' ')}`)
  };
}

// ==================== 导出云崽兼容接口 ====================

/**
 * 云崽插件导出格式检测
 */
export function isYunzaiPlugin(module: any): boolean {
  // 检查是否是云崽插件类
  if (module && typeof module === 'function' && module.prototype instanceof YunzaiPlugin) {
    return true;
  }
  
  // 检查是否是云崽插件对象（实例）
  if (module && typeof module === 'object' && !Array.isArray(module) && (module.rule || module.task || module.accept)) {
    return true;
  }
  
  // 检查是否是云崽插件数组（多插件导出）
  if (Array.isArray(module) && module.length > 0) {
    const first = module[0];
    // 检查是否是类（函数）- 云崽插件通常导出类
    if (typeof first === 'function') {
      return true;
    }
    // 检查是否是对象实例
    if (first && typeof first === 'object' && (first.rule || first.task || first.accept || first.name)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 加载云崽插件
 */
export function loadYunzaiPlugin(module: any, pluginId?: string): Plugin | Plugin[] | null {
  try {
    // 如果是类，创建实例
    if (typeof module === 'function') {
      const instance = new module();
      return convertYunzaiPlugin(instance, pluginId);
    }
    
    // 如果是数组，转换每个插件
    if (Array.isArray(module)) {
      const plugins: Plugin[] = [];
      for (let i = 0; i < module.length; i++) {
        const item = module[i];
        let instance: any;
        
        // 如果数组元素是类（函数），创建实例
        if (typeof item === 'function') {
          instance = new item();
        } else if (typeof item === 'object' && item !== null) {
          // 已经是实例对象
          instance = item;
        } else {
          addSystemLog('WARN', 'plugin', `跳过无效的插件导出项 [${i}]: ${typeof item}`);
          continue;
        }
        
        const converted = convertYunzaiPlugin(instance, `${pluginId || 'yunzai'}-${i}`);
        if (converted) {
          plugins.push(converted);
        }
      }
      return plugins.length === 1 ? plugins[0] : plugins.length > 0 ? plugins : null;
    }
    
    // 如果是对象，直接转换
    if (typeof module === 'object' && module !== null) {
      return convertYunzaiPlugin(module, pluginId);
    }
    
    return null;
  } catch (error) {
    addSystemLog('ERROR', 'plugin', `加载云崽插件失败: ${error}`);
    return null;
  }
}
