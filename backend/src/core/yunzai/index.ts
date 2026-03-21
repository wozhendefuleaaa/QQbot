/**
 * Yunzai 适配器主模块
 * 提供完整的 Yunzai 插件系统兼容层
 */

// 导出类型定义
export * from './types.js'

// 导出配置模块
export { 
  cfg, 
  setYunzaiConfig, 
  getYunzaiConfig, 
  initYunzaiConfig,
  setPermissionConfig,
  getPermissionConfig,
  addMaster,
  removeMaster,
  addAdmin,
  removeAdmin,
  isMaster,
  isAdmin
} from './config.js'

// 导出消息段模块
export { 
  segment, 
  parseMessageToSegments, 
  segmentToText, 
  segmentToString, 
  segmentToQQOfficial, 
  segmentsToQQOfficial 
} from './segment.js'

// 导出 Handler 模块
export { 
  Handler, 
  createRuntimeHandler 
} from './handler.js'

// 导出插件基类
export { 
  YunzaiPlugin, 
  getStateArr, 
  clearExpiredContexts 
} from './plugin.js'

// 导出事件模块
export { 
  createYunzaiEvent, 
  createGuildMessageEvent, 
  createPrivateMessageEvent, 
  createGroupMessageEvent 
} from './event.js'

// 导出 Bot 模块
export { 
  createYunzaiBot, 
  createSimpleYunzaiBot, 
  botManager 
} from './bot.js'

// 导入所需模块
import { cfg, initYunzaiConfig, isMaster, isAdmin } from './config.js'
import { segment } from './segment.js'
import { Handler, createRuntimeHandler } from './handler.js'
import { YunzaiPlugin, getStateArr, clearExpiredContexts } from './plugin.js'
import { createYunzaiEvent, createGroupMessageEvent, createPrivateMessageEvent, createGuildMessageEvent } from './event.js'
import { createYunzaiBot, botManager } from './bot.js'
import { YunzaiRule, YunzaiTask, YunzaiEvent, YunzaiBot } from './types.js'

/**
 * 全局 Bot 对象
 * 用于存储当前活跃的 Bot 实例
 */
let globalBot: YunzaiBot | null = null

/**
 * 初始化 Yunzai 全局对象
 * 将 Yunzai 需要的全局对象注入到 globalThis
 */
export function initYunzaiGlobals(bot?: YunzaiBot): void {
  // 设置 Bot 全局对象
  if (bot) {
    globalBot = bot
  }
  
  // 注入到 globalThis
  ;(globalThis as any).Bot = globalBot
  ;(globalThis as any).segment = segment
  ;(globalThis as any).Handler = Handler
  ;(globalThis as any).cfg = cfg
  ;(globalThis as any).isMaster = isMaster
  ;(globalThis as any).isAdmin = isAdmin
  
  // 初始化配置
  initYunzaiConfig()
  
  console.log('[Yunzai] 全局对象初始化完成')
}

/**
 * 设置全局 Bot
 */
export function setGlobalBot(bot: YunzaiBot): void {
  globalBot = bot
  ;(globalThis as any).Bot = bot
}

/**
 * 获取全局 Bot
 */
export function getGlobalBot(): YunzaiBot | null {
  return globalBot
}

/**
 * 检查是否是 Yunzai 插件
 */
export function isYunzaiPlugin(pluginModule: any): boolean {
  // 检查是否是 YunzaiPlugin 类的实例或子类
  if (pluginModule instanceof YunzaiPlugin) {
    return true
  }
  
  // 检查是否是 YunzaiPlugin 的子类
  if (typeof pluginModule === 'function' && pluginModule.prototype instanceof YunzaiPlugin) {
    return true
  }
  
  // 检查是否是导出的类
  if (pluginModule.default && (
    pluginModule.default.prototype instanceof YunzaiPlugin ||
    typeof pluginModule.default === 'function' && pluginModule.default.prototype instanceof YunzaiPlugin
  )) {
    return true
  }
  
  // 检查是否有 Yunzai 插件的特征属性
  if (pluginModule.rule || pluginModule.task || pluginModule.handler) {
    return true
  }
  
  return false
}

/**
 * 加载 Yunzai 插件
 */
export async function loadYunzaiPlugin(
  pluginPath: string,
  bot: YunzaiBot,
  event: YunzaiEvent
): Promise<YunzaiPlugin | null> {
  try {
    // 动态导入插件模块
    const pluginModule = await import(pluginPath)
    
    // 获取插件类
    let PluginClass: typeof YunzaiPlugin | null = null
    
    if (pluginModule.default && pluginModule.default.prototype instanceof YunzaiPlugin) {
      PluginClass = pluginModule.default
    } else if (pluginModule.prototype instanceof YunzaiPlugin) {
      PluginClass = pluginModule
    } else if (typeof pluginModule === 'function') {
      // 可能是普通函数导出
      const instance = new pluginModule()
      if (instance instanceof YunzaiPlugin) {
        return instance
      }
    }
    
    if (!PluginClass) {
      console.warn(`[Yunzai] 无法识别的插件格式: ${pluginPath}`)
      return null
    }
    
    // 创建插件实例
    const plugin = new PluginClass()
    
    // 设置插件的 e 属性
    plugin.e = event
    
    return plugin
  } catch (error) {
    console.error(`[Yunzai] 加载插件失败: ${pluginPath}`, error)
    return null
  }
}

/**
 * 转换 Yunzai 插件为内部插件格式
 */
export function convertYunzaiPlugin(
  plugin: YunzaiPlugin,
  bot: YunzaiBot
): {
  name: string
  description: string
  commands: Array<{
    name: string
    description: string
    pattern: string | RegExp
    handler: (event: YunzaiEvent) => Promise<any>
  }>
  handlers: Array<{
    event: string
    handler: (event: YunzaiEvent) => Promise<any>
  }>
  tasks: Array<{
    name: string
    cron: string
    handler: () => Promise<any>
  }>
} {
  const commands: Array<{
    name: string
    description: string
    pattern: string | RegExp
    handler: (event: YunzaiEvent) => Promise<any>
  }> = []
  
  const handlers: Array<{
    event: string
    handler: (event: YunzaiEvent) => Promise<any>
  }> = []
  
  const tasks: Array<{
    name: string
    cron: string
    handler: () => Promise<any>
  }> = []
  
  // 处理规则（命令）
  if (plugin.rule && Array.isArray(plugin.rule)) {
    for (const rule of plugin.rule as YunzaiRule[]) {
      if (rule.reg && rule.fnc) {
        const handler = typeof rule.fnc === 'string' ? (plugin as any)[rule.fnc] : rule.fnc
        if (typeof handler === 'function') {
          commands.push({
            name: rule.fnc || 'handler',
            description: rule.log !== false ? `匹配: ${rule.reg.toString()}` : '',
            pattern: rule.reg,
            handler: async (event: YunzaiEvent) => {
              plugin.e = event
              return handler.call(plugin, event)
            }
          })
        }
      }
    }
  }
  
  // 处理事件处理器
  if (plugin.handler && Array.isArray(plugin.handler)) {
    for (const h of plugin.handler) {
      if (h.key && h.fn) {
        const handler = typeof h.fn === 'string' ? (plugin as any)[h.fn] : h.fn
        if (typeof handler === 'function') {
          handlers.push({
            event: h.key,
            handler: async (event: YunzaiEvent) => {
              plugin.e = event
              return handler.call(plugin, event)
            }
          })
        }
      }
    }
  }
  
  // 处理定时任务
  if (plugin.task && Array.isArray(plugin.task)) {
    for (const t of plugin.task as YunzaiTask[]) {
      if (t.cron && t.fnc) {
        const handler = typeof t.fnc === 'string' ? (plugin as any)[t.fnc] : t.fnc
        if (typeof handler === 'function') {
          tasks.push({
            name: t.name || t.fnc,
            cron: t.cron,
            handler: async () => {
              return handler.call(plugin)
            }
          })
        }
      }
    }
  }
  
  return {
    name: plugin.name || 'unnamed-plugin',
    description: plugin.dsc || '',
    commands,
    handlers,
    tasks
  }
}

/**
 * 匹配消息与插件规则
 */
export function matchRule(message: string, rule: YunzaiRule): boolean {
  if (!rule.reg) return false
  
  if (rule.reg instanceof RegExp) {
    return rule.reg.test(message)
  }
  
  // 如果是字符串，转换为正则
  try {
    const regex = new RegExp(rule.reg)
    return regex.test(message)
  } catch {
    return false
  }
}

/**
 * 执行插件命令
 */
export async function executePluginCommand(
  plugin: YunzaiPlugin,
  handler: string | Function,
  event: YunzaiEvent
): Promise<any> {
  const fn = typeof handler === 'string' ? (plugin as any)[handler] : handler
  
  if (typeof fn !== 'function') {
    console.warn(`[Yunzai] 插件方法不存在: ${handler}`)
    return false
  }
  
  try {
    plugin.e = event
    const result = await fn.call(plugin, event)
    return result
  } catch (error) {
    console.error(`[Yunzai] 执行插件命令失败:`, error)
    return false
  }
}

/**
 * 创建完整的 Yunzai 适配器
 */
export function createYunzaiAdapter(
  botId: string,
  api: {
    sendMessage: (targetId: string, targetType: 'user' | 'group', text: string, msgId?: string) => Promise<void>
    getGroupList?: () => Promise<any[]>
    getFriendList?: () => Promise<any[]>
    getGroupMemberList?: (groupId: string) => Promise<any[]>
    getGroupMemberInfo?: (groupId: string, userId: string) => Promise<any>
    setGroupBan?: (groupId: string, userId: string, duration: number) => Promise<void>
    setGroupWholeBan?: (groupId: string, enable: boolean) => Promise<void>
    setGroupKick?: (groupId: string, userId: string) => Promise<void>
    deleteMsg?: (messageId: string) => Promise<void>
    getMsg?: (messageId: string) => Promise<any>
  }
): {
  bot: YunzaiBot
  createEvent: (messageEvent: any) => YunzaiEvent
  init: () => void
} {
  // 创建 Bot 实例
  const bot = createYunzaiBot(botId, {}, api)
  
  // 注册到管理器
  botManager.addBot(botId, bot)
  
  // 创建事件工厂函数
  const createEvent = (messageEvent: any) => {
    return createYunzaiEvent(messageEvent, botId, api.sendMessage)
  }
  
  // 初始化函数
  const init = () => {
    initYunzaiGlobals(bot)
  }
  
  return {
    bot,
    createEvent,
    init
  }
}

// 默认导出
export default {
  initYunzaiGlobals,
  setGlobalBot,
  getGlobalBot,
  isYunzaiPlugin,
  loadYunzaiPlugin,
  convertYunzaiPlugin,
  matchRule,
  executePluginCommand,
  createYunzaiAdapter,
  segment,
  Handler,
  cfg,
  YunzaiPlugin,
  botManager
}
