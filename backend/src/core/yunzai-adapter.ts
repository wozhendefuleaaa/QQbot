/**
 * 云崽适配器 - 向后兼容入口
 * 重新导出模块化的 yunzai 模块
 * 
 * 这个文件保持向后兼容性，所有功能已迁移到 yunzai/ 目录下的模块化文件
 */

// 从模块化入口重新导出所有内容
export * from './yunzai/index.js'

// 导出默认适配器创建函数
export { createYunzaiAdapter, initYunzaiGlobals, isYunzaiPlugin, loadYunzaiPlugin, convertYunzaiPlugin } from './yunzai/index.js'

// 导出类型
export type { 
  YunzaiConfig, 
  YunzaiPermissionConfig, 
  SegmentType, 
  ReplyOptions, 
  YunzaiGroup, 
  YunzaiFriend, 
  YunzaiMember, 
  YunzaiRuntime, 
  YunzaiEvent, 
  YunzaiRule, 
  YunzaiTask, 
  YunzaiHandlerDef, 
  YunzaiBot 
} from './yunzai/types.js'

// 导出插件基类
export { YunzaiPlugin } from './yunzai/plugin.js'

// 导出配置对象
export { cfg, initYunzaiConfig, isMaster, isAdmin, addMaster, addAdmin } from './yunzai/config.js'

// 导出消息段构建器
export { segment } from './yunzai/segment.js'

// 导出 Handler
export { Handler } from './yunzai/handler.js'

// 导出 Bot 管理器
export { botManager, createYunzaiBot } from './yunzai/bot.js'

// 导出事件创建函数
export { 
  createYunzaiEvent, 
  createGroupMessageEvent, 
  createPrivateMessageEvent, 
  createGuildMessageEvent 
} from './yunzai/event.js'
