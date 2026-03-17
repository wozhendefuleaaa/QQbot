import { existsSync, promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Plugin, PluginContext, PluginConfig, MessageEvent, CommandDefinition, CommandPermission } from './plugin-types.js';
import { addSystemLog, plugins as pluginRegistry, savePluginsToDisk, accounts, platformStatus, conversations, messages, appConfig } from './store.js';
import { trySendToQQ } from '../modules/platform/gateway.js';
import { broadcastNewMessage } from '../modules/sse/routes.js';
import { Message } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.join(__dirname, '..', 'plugins');

// 默认插件配置
const defaultConfig: PluginConfig = {
  commandPrefix: '/',
  allowGroup: true,
  allowPrivate: true,
  adminUserIds: [],
  ownerIds: []
};

// 已加载的插件实例
const loadedPlugins: Map<string, Plugin> = new Map();

// 插件配置
let pluginConfig: PluginConfig = { ...defaultConfig };

// 命令冷却记录: `${cmdName}:${senderId}` -> 上次执行时间戳
const commandCooldowns: Map<string, number> = new Map();

// 帮助命令缓存
let helpCommandCache: string | null = null;

/**
 * 创建插件上下文
 */
function createPluginContext(pluginId: string, replyInfo?: { targetId: string; targetType: 'user' | 'group'; msgId?: string }): PluginContext {
  return {
    sendMessage: async (targetId: string, targetType: 'user' | 'group', text: string) => {
      const accountId = platformStatus.connectedAccountId;
      if (!accountId) {
        throw new Error('平台未连接');
      }
      const account = accounts.find(a => a.id === accountId);
      if (!account) {
        throw new Error('未找到账号信息');
      }
      // 如果没有指定 targetId，使用回复信息中的 targetId
      const finalTargetId = targetId || replyInfo?.targetId;
      const finalTargetType = targetType || replyInfo?.targetType;
      if (!finalTargetId) {
        throw new Error('未指定发送目标');
      }
      // 使用传入的 msgId 或回复信息中的 msgId 进行回复
      const msgId = replyInfo?.msgId;
      await trySendToQQ(account, finalTargetId, text, msgId, finalTargetType);
      
      // 广播插件发送的消息到前端
      // 查找对应的会话
      const conv = conversations.find(c => c.peerId === finalTargetId);
      if (conv) {
        const outboundMsg: Message = {
          id: `plugin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          accountId,
          conversationId: conv.id,
          direction: 'out',
          text,
          createdAt: new Date().toISOString()
        };
        // 添加到消息存储
        messages.push(outboundMsg);
        // 广播到前端
        broadcastNewMessage(conv.id, outboundMsg);
      }
    },
    log: (level: 'info' | 'warn' | 'error', message: string) => {
      addSystemLog(level.toUpperCase() as 'INFO' | 'WARN' | 'ERROR', 'plugin', `[${pluginId}] ${message}`);
    },
    getConnectedAccountId: () => platformStatus.connectedAccountId
  };
}

/**
 * 确保插件目录存在
 */
async function ensurePluginsDir(): Promise<void> {
  if (!existsSync(PLUGINS_DIR)) {
    await fs.mkdir(PLUGINS_DIR, { recursive: true });
  }
}

/**
 * 扫描并加载所有插件
 */
export async function loadAllPlugins(): Promise<void> {
  await ensurePluginsDir();
  
  const files = await fs.readdir(PLUGINS_DIR);
  const pluginFiles = files.filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
  
  for (const file of pluginFiles) {
    try {
      await loadPluginFromFile(path.join(PLUGINS_DIR, file));
    } catch (error) {
      addSystemLog('ERROR', 'plugin', `加载插件文件失败: ${file} - ${error}`);
    }
  }
  
  // 清除帮助缓存
  helpCommandCache = null;
  
  addSystemLog('INFO', 'plugin', `已加载 ${loadedPlugins.size} 个插件`);
}

/**
 * 从文件加载插件
 */
export async function loadPluginFromFile(filePath: string): Promise<Plugin | null> {
  try {
    // ESM 模式下动态导入会自动处理缓存
    // 添加时间戳查询参数来绕过模块缓存，支持热重载
    const importPath = `${filePath}?t=${Date.now()}`;
    
    const module = await import(importPath);
    const plugin: Plugin = module.default || module.plugin;
    
    if (!plugin || !plugin.id || !plugin.name) {
      addSystemLog('WARN', 'plugin', `插件文件格式无效: ${filePath}`);
      return null;
    }
    
    // 检查是否在注册表中启用
    const registry = pluginRegistry.find(p => p.id === plugin.id);
    if (registry && !registry.enabled) {
      addSystemLog('INFO', 'plugin', `插件已禁用，跳过加载: ${plugin.name}`);
      return null;
    }
    
    // 如果已加载，先卸载
    if (loadedPlugins.has(plugin.id)) {
      await unloadPlugin(plugin.id);
    }
    
    // 加载插件
    const ctx = createPluginContext(plugin.id);
    if (plugin.onLoad) {
      await plugin.onLoad(ctx);
    }
    
    loadedPlugins.set(plugin.id, plugin);
    addSystemLog('INFO', 'plugin', `插件已加载: ${plugin.name} v${plugin.version}`);
    
    // 更新或添加到注册表
    if (!registry) {
      pluginRegistry.unshift({
        id: plugin.id,
        name: plugin.name,
        enabled: true,
        version: plugin.version,
        description: plugin.description,
        updatedAt: new Date().toISOString()
      });
      await savePluginsToDisk();
    }
    
    // 清除帮助缓存
    helpCommandCache = null;
    
    return plugin;
  } catch (error) {
    addSystemLog('ERROR', 'plugin', `加载插件失败: ${filePath} - ${error}`);
    return null;
  }
}

/**
 * 卸载插件
 */
export async function unloadPlugin(pluginId: string): Promise<boolean> {
  const plugin = loadedPlugins.get(pluginId);
  if (!plugin) {
    return false;
  }
  
  try {
    if (plugin.onUnload) {
      await plugin.onUnload();
    }
    
    loadedPlugins.delete(pluginId);
    addSystemLog('INFO', 'plugin', `插件已卸载: ${plugin.name}`);
    
    // 清除帮助缓存
    helpCommandCache = null;
    
    return true;
  } catch (error) {
    addSystemLog('ERROR', 'plugin', `卸载插件失败: ${pluginId} - ${error}`);
    return false;
  }
}

/**
 * 重新加载插件
 */
export async function reloadPlugin(pluginId: string): Promise<Plugin | null> {
  // 查找插件文件
  const files = await fs.readdir(PLUGINS_DIR);
  const pluginFiles = files.filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
  
  for (const file of pluginFiles) {
    const filePath = path.join(PLUGINS_DIR, file);
    try {
      const module = await import(filePath);
      const plugin: Plugin = module.default || module.plugin;
      
      if (plugin && plugin.id === pluginId) {
        return loadPluginFromFile(filePath);
      }
    } catch {
      // 忽略错误，继续查找
    }
  }
  
  return null;
}

/**
 * 检查用户权限
 */
function checkPermission(
  permission: CommandPermission,
  senderId: string,
  config: PluginConfig
): boolean {
  if (permission === 'public') {
    return true;
  }
  
  if (permission === 'admin') {
    return config.adminUserIds.includes(senderId) || 
           (config.ownerIds?.includes(senderId) ?? false);
  }
  
  if (permission === 'owner') {
    return config.ownerIds?.includes(senderId) ?? false;
  }
  
  return true; // 默认公开
}

/**
 * 检查命令冷却
 */
function checkCooldown(
  cmdName: string,
  senderId: string,
  cooldown: number | undefined
): { allowed: boolean; remaining: number } {
  if (!cooldown || cooldown <= 0) {
    return { allowed: true, remaining: 0 };
  }
  
  const key = `${cmdName}:${senderId}`;
  const lastUsed = commandCooldowns.get(key);
  const now = Date.now();
  
  if (!lastUsed) {
    return { allowed: true, remaining: 0 };
  }
  
  const elapsed = (now - lastUsed) / 1000;
  if (elapsed >= cooldown) {
    return { allowed: true, remaining: 0 };
  }
  
  return { allowed: false, remaining: Math.ceil(cooldown - elapsed) };
}

/**
 * 记录命令使用时间
 */
function recordCommandUse(cmdName: string, senderId: string): void {
  const key = `${cmdName}:${senderId}`;
  commandCooldowns.set(key, Date.now());
}

/**
 * 生成帮助文本
 */
function generateHelpText(): string {
  if (helpCommandCache) {
    return helpCommandCache;
  }
  
  const commands = getAvailableCommands();
  const prefix = pluginConfig.commandPrefix;
  
  const lines: string[] = ['📖 可用命令列表：', ''];
  
  for (const { plugin, command } of commands) {
    if (command.hidden) continue;
    
    const permLabel = command.permission === 'admin' ? ' [管理员]' : 
                      command.permission === 'owner' ? ' [所有者]' : '';
    const aliases = command.aliases?.length ? ` (${command.aliases.join(', ')})` : '';
    
    lines.push(`${prefix}${command.name}${aliases}${permLabel}`);
    lines.push(`  ${command.description}`);
    if (command.usage) {
      lines.push(`  用法: ${command.usage}`);
    }
  }
  
  lines.push('');
  lines.push(`共 ${commands.filter(c => !c.command.hidden).length} 个命令`);
  
  helpCommandCache = lines.join('\n');
  return helpCommandCache;
}

/**
 * 检查插件是否被禁用（基于权限矩阵）
 */
function isPluginDisabled(pluginId: string, accountId: string | null, groupId: string | undefined): boolean {
  if (!accountId) return false;
  
  // 对于私聊，groupId 为 undefined，使用 'private' 作为标识
  const effectiveGroupId = groupId || 'private';
  
  // 获取该账号的权限矩阵
  const permMatrix = appConfig.pluginPermissions[accountId];
  if (!permMatrix) return false;
  
  // 检查该群组是否在配置中
  if (!permMatrix.groups.includes(effectiveGroupId)) return false;
  
  // 检查该插件是否在该群组的禁用列表中
  const disabledList = permMatrix.disabledPlugins[effectiveGroupId];
  if (!disabledList) return false;
  
  return disabledList.includes(pluginId);
}

/**
 * 处理消息 - 分发给所有启用的插件
 */
export async function dispatchMessage(message: Message, peerId?: string, peerType?: 'user' | 'group', inboundMsgId?: string): Promise<boolean> {
  const isGroup = peerType === 'group' || message.conversationId.includes('_group_');
  // 使用传入的 peerId 或从 conversationId 解析
  const senderId = peerId || (message.direction === 'in' ? message.conversationId.split('_').pop() || '' : '');
  
  const event: MessageEvent = {
    message,
    isGroup,
    senderId,
    groupId: isGroup ? (peerId || message.conversationId.split('_')[1]) : undefined
  };
  
  // 调试日志：显示收到的消息内容
  addSystemLog('INFO', 'plugin', `dispatchMessage: text="${message.text}" isGroup=${isGroup} senderId=${senderId}`);
  
  // 检查群聊/私聊权限
  if (isGroup && !pluginConfig.allowGroup) {
    return false;
  }
  if (!isGroup && !pluginConfig.allowPrivate) {
    return false;
  }
  
  // 获取当前连接的账号ID
  const currentAccountId = platformStatus.connectedAccountId;
  
  // 按优先级排序插件，并过滤掉被禁用的插件
  const sortedPlugins = Array.from(loadedPlugins.values())
    .filter(p => p.enabled !== false)
    .filter(p => !isPluginDisabled(p.id, currentAccountId, event.groupId))
    .sort((a, b) => (a.priority || 100) - (b.priority || 100));
  
  // 构建回复信息，用于插件直接回复消息
  const replyInfo: { targetId: string; targetType: 'user' | 'group'; msgId?: string } = {
    targetId: peerId || senderId,
    targetType: isGroup ? 'group' : 'user',
    msgId: inboundMsgId // 使用传入的 inboundMsgId 进行被动回复
  };
  
  for (const plugin of sortedPlugins) {
    try {
      const ctx = createPluginContext(plugin.id, replyInfo);
      
      // 检查命令（支持可选前缀）
      if (plugin.commands) {
        const handled = await handleCommand(plugin.commands, message, event, ctx);
        if (handled) {
          return true;
        }
      }
      
      // 调用消息处理器
      if (plugin.onMessage) {
        const result = await plugin.onMessage(event, ctx);
        if (result === true) {
          return true; // 插件拦截了消息
        }
      }
    } catch (error) {
      addSystemLog('ERROR', 'plugin', `插件处理消息失败: ${plugin.id} - ${error}`);
    }
  }
  
  return false;
}

/**
 * 处理命令
 */
async function handleCommand(
  commands: CommandDefinition[],
  message: Message,
  event: MessageEvent,
  ctx: PluginContext
): Promise<boolean> {
  const prefix = pluginConfig.commandPrefix;
  const text = message.text.trim();
  
  // 检查帮助命令（支持有无前缀）
  if (text === `${prefix}help` || text === `${prefix}帮助` || text === 'help' || text === '帮助') {
    const helpText = generateHelpText();
    const targetId = event.isGroup ? event.groupId : event.senderId;
    const targetType = event.isGroup ? 'group' : 'user';
    await ctx.sendMessage(targetId || '', targetType, helpText);
    return true;
  }
  
  for (const cmd of commands) {
    // 检查主命令和别名
    const names = [cmd.name, ...(cmd.aliases || [])];
    
    for (const name of names) {
      // 支持有无前缀两种形式
      const cmdWithPrefix = `${prefix}${name}`;
      const cmdWithoutPrefix = name;
      
      // 检查是否匹配命令（带前缀或不带前缀）
      let matched = false;
      let argsStartIndex = 0;
      
      if (text === cmdWithPrefix || text.startsWith(`${cmdWithPrefix} `)) {
        matched = true;
        argsStartIndex = cmdWithPrefix.length;
      } else if (text === cmdWithoutPrefix || text.startsWith(`${cmdWithoutPrefix} `)) {
        matched = true;
        argsStartIndex = cmdWithoutPrefix.length;
      }
      
      if (matched) {
        // 权限检查
        const permission = cmd.permission || 'public';
        if (!checkPermission(permission, event.senderId, pluginConfig)) {
          const targetId = event.isGroup ? event.groupId : event.senderId;
          const targetType = event.isGroup ? 'group' : 'user';
          await ctx.sendMessage(targetId || '', targetType, '⚠️ 您没有权限执行此命令');
          return true;
        }
        
        // 冷却检查
        const cooldownCheck = checkCooldown(cmd.name, event.senderId, cmd.cooldown);
        if (!cooldownCheck.allowed) {
          const targetId = event.isGroup ? event.groupId : event.senderId;
          const targetType = event.isGroup ? 'group' : 'user';
          await ctx.sendMessage(targetId || '', targetType, `⏳ 命令冷却中，请等待 ${cooldownCheck.remaining} 秒`);
          return true;
        }
        
        const args = text.slice(argsStartIndex).trim().split(/\s+/).filter(Boolean);
        
        try {
          const result = await cmd.handler(args, event, ctx);
          if (typeof result === 'string' && result) {
            // 发送回复
            const targetId = event.isGroup ? event.groupId : event.senderId;
            const targetType = event.isGroup ? 'group' : 'user';
            ctx.log('info', `准备发送回复: targetId=${targetId} targetType=${targetType} isGroup=${event.isGroup} groupId=${event.groupId} senderId=${event.senderId}`);
            await ctx.sendMessage(targetId || '', targetType, result);
          }
          
          // 记录命令使用
          recordCommandUse(cmd.name, event.senderId);
          
          return true;
        } catch (error) {
          ctx.log('error', `命令执行失败: ${cmd.name} - ${error}`);
          const targetId = event.isGroup ? event.groupId : event.senderId;
          const targetType = event.isGroup ? 'group' : 'user';
          await ctx.sendMessage(targetId || '', targetType, `❌ 命令执行失败: ${error}`);
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * 获取已加载的插件列表
 */
export function getLoadedPlugins(): Plugin[] {
  return Array.from(loadedPlugins.values());
}

/**
 * 获取插件配置
 */
export function getPluginConfig(): PluginConfig {
  return { ...pluginConfig };
}

/**
 * 更新插件配置
 */
export function updatePluginConfig(config: Partial<PluginConfig>): void {
  pluginConfig = { ...pluginConfig, ...config };
  // 清除帮助缓存
  helpCommandCache = null;
}

/**
 * 获取所有可用命令
 */
export function getAvailableCommands(): Array<{ plugin: string; command: CommandDefinition }> {
  const result: Array<{ plugin: string; command: CommandDefinition }> = [];
  
  for (const plugin of loadedPlugins.values()) {
    if (plugin.enabled !== false && plugin.commands) {
      for (const cmd of plugin.commands) {
        result.push({ plugin: plugin.name, command: cmd });
      }
    }
  }
  
  return result;
}

/**
 * 清理过期的冷却记录
 */
export function cleanupCooldowns(): void {
  const now = Date.now();
  const maxAge = 3600000; // 1小时
  
  for (const [key, timestamp] of commandCooldowns.entries()) {
    if (now - timestamp > maxAge) {
      commandCooldowns.delete(key);
    }
  }
}

// 定期清理冷却记录
setInterval(cleanupCooldowns, 600000); // 每10分钟清理一次
