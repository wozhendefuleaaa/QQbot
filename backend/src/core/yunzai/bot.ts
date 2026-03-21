/**
 * Yunzai Bot 对象模块
 * 负责创建和管理 Yunzai 风格的 Bot 对象
 */

import { YunzaiBot, YunzaiGroup, YunzaiFriend, YunzaiMember, SegmentType } from './types.js'
import { segment, segmentToText, segmentsToQQOfficial } from './segment.js'

/**
 * 创建 Yunzai 风格的 Bot 对象
 */
export function createYunzaiBot(
  botId: string,
  botInfo: {
    name?: string
    avatar?: string
  } = {},
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
): YunzaiBot {
  const bot: YunzaiBot = {
    // 基础信息
    uin: botId,
    nickname: botInfo.name || 'Bot',
    avatar: botInfo.avatar || '',
    
    // 状态信息
    online_status: 1,
    stat: {
      start_time: Date.now(),
      online: 1
    },
    
    // 版本信息
    version: {
      id: 'wawa-qqbot',
      name: 'Wawa QQBot',
      version: '1.0.0'
    },
    
    // bots 和 adapter 占位
    bots: {},
    adapter: [],
    
    // 发送私聊消息
    sendPrivateMsg: async (userId: string, message: string | SegmentType | SegmentType[]) => {
      const text = typeof message === 'string' ? message : segmentToText(message)
      await api.sendMessage(userId, 'user', text)
      return { message_id: '' }
    },
    
    // 发送群消息
    sendGroupMsg: async (groupId: string, message: string | SegmentType | SegmentType[]) => {
      const text = typeof message === 'string' ? message : segmentToText(message)
      await api.sendMessage(groupId, 'group', text)
      return { message_id: '' }
    },
    
    // 发送消息（自动判断类型）
    sendMsg: async (targetId: string, message: string | SegmentType | SegmentType[], isGroup: boolean = false) => {
      const text = typeof message === 'string' ? message : segmentToText(message)
      await api.sendMessage(targetId, isGroup ? 'group' : 'user', text)
      return { message_id: '' }
    },
    
    // 获取群列表
    getGroupList: async () => {
      if (api.getGroupList) {
        return api.getGroupList()
      }
      return []
    },
    
    // 获取好友列表
    getFriendList: async () => {
      if (api.getFriendList) {
        return api.getFriendList()
      }
      return []
    },
    
    // 获取群信息
    getGroupInfo: async (groupId: string) => {
      const groups = await bot.getGroupList()
      return groups.find((g: any) => g.id === groupId || g.group_id === groupId) || null
    },
    
    // 获取群成员列表
    getGroupMemberList: async (groupId: string) => {
      if (api.getGroupMemberList) {
        return api.getGroupMemberList(groupId)
      }
      return []
    },
    
    // 获取群成员信息
    getGroupMemberInfo: async (groupId: string, userId: string) => {
      if (api.getGroupMemberInfo) {
        return api.getGroupMemberInfo(groupId, userId)
      }
      return null
    },
    
    // 挑选群成员
    pickMember: (groupId: string, userId: string): YunzaiMember => ({
      user_id: userId,
      nickname: '',
      card: '',
      role: 'member',
      info: {}
    }),
    
    // 挑选群
    pickGroup: (groupId: string): YunzaiGroup => ({
      group_id: groupId,
      group_name: '',
      sendMsg: async (msg: string | SegmentType | SegmentType[]) => {
        const text = typeof msg === 'string' ? msg : segmentToText(msg)
        await api.sendMessage(groupId, 'group', text)
      },
      pickMember: (userId: string): YunzaiMember => bot.pickMember(groupId, userId)
    }),
    
    // 挑选好友
    pickFriend: (userId: string): YunzaiFriend => ({
      user_id: userId,
      nickname: '',
      sendMsg: async (msg: string | SegmentType | SegmentType[]) => {
        const text = typeof msg === 'string' ? msg : segmentToText(msg)
        await api.sendMessage(userId, 'user', text)
      }
    }),
    
    // 挑选用户（同 pickFriend）
    pickUser: (userId: string): YunzaiFriend => bot.pickFriend(userId),
    
    // 设置群禁言
    setGroupBan: async (groupId: string, userId: string, duration: number = 0) => {
      if (api.setGroupBan) {
        await api.setGroupBan(groupId, userId, duration)
      }
    },
    
    // 设置群全员禁言
    setGroupWholeBan: async (groupId: string, enable: boolean = true) => {
      if (api.setGroupWholeBan) {
        await api.setGroupWholeBan(groupId, enable)
      }
    },
    
    // 踢出群成员
    setGroupKick: async (groupId: string, userId: string) => {
      if (api.setGroupKick) {
        await api.setGroupKick(groupId, userId)
      }
    },
    
    // 撤回消息
    deleteMsg: async (messageId: string) => {
      if (api.deleteMsg) {
        await api.deleteMsg(messageId)
      }
    },
    
    // 获取消息
    getMsg: async (messageId: string) => {
      if (api.getMsg) {
        return api.getMsg(messageId)
      }
      return null
    },
    
    // 获取头像 URL
    getAvatarUrl: (size: number = 640) => {
      return `https://q1.qlogo.cn/g?b=qq&nk=${botId}&s=${size}`
    },
    
    // 获取群头像 URL
    getGroupAvatarUrl: (groupId: string, size: number = 640) => {
      return `https://p.qlogo.cn/gh/${groupId}/${groupId}/${size}`
    },
    
    // 获取用户头像 URL
    getUserAvatarUrl: (userId: string, size: number = 640) => {
      return `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=${size}`
    },
    
    // 检查是否在线
    isOnline: () => true,
    
    // 登出
    logout: async () => {
      console.log(`[Yunzai] Bot ${botId} logout`)
    },
    
    // 设置在线状态
    setOnlineStatus: async (status: number) => {
      console.log(`[Yunzai] Set online status: ${status}`)
    },
    
    // 日志
    makeLog: (level: string, msg: any, id?: string | boolean, force?: boolean) => {
      console.log(`[Yunzai][${level}]`, msg)
    },
    
    // 创建转发消息
    makeForwardMsg: (messages: any[]) => {
      return {
        type: 'forward',
        data: messages
      }
    },
    
    // 创建转发数组
    makeForwardArray: (msg: any[], node?: any) => {
      return {
        type: 'forward',
        data: msg
      }
    },
    
    // 休眠
    sleep: (ms: number, promise?: Promise<any>) => {
      return new Promise(resolve => setTimeout(resolve, ms))
    },
    
    // 转字符串
    String: (data: any) => {
      if (typeof data === 'string') return data
      return JSON.stringify(data)
    },
    
    // 转 Buffer
    Buffer: async (data: any, opts?: any) => {
      return Buffer.from(data)
    },
    
    // 下载
    download: async (url: string, file?: string, opts?: any) => {
      console.log(`[Yunzai] Download: ${url}`)
      return null
    },
    
    // 创建目录
    mkdir: async (dir: string) => {
      console.log(`[Yunzai] Mkdir: ${dir}`)
      return true
    },
    
    // 删除文件
    rm: async (file: string) => {
      console.log(`[Yunzai] Rm: ${file}`)
      return true
    },
    
    // 文件状态
    fsStat: async (path: string, opts?: any) => {
      console.log(`[Yunzai] FsStat: ${path}`)
      return null
    },
    
    // 执行命令
    exec: async (cmd: string | string[], opts?: any) => {
      console.log(`[Yunzai] Exec:`, cmd)
      return { stdout: '', stderr: '' }
    },
    
    // 事件监听
    on: (event: string, listener: (...args: any[]) => void) => {
      // 占位实现
    },
    
    once: (event: string, listener: (...args: any[]) => void) => {
      // 占位实现
    },
    
    emit: (event: string, ...args: any[]) => {
      return false
    },
    
    off: (event: string, listener: (...args: any[]) => void) => {
      // 占位实现
    },
    
    // 发送事件
    em: (event: string, data: any) => {
      // 占位实现
    }
  }
  
  return bot
}

/**
 * 创建简化版 Bot 对象（用于不需要完整 API 的场景）
 */
export function createSimpleYunzaiBot(
  botId: string,
  sendMessage: (targetId: string, targetType: 'user' | 'group', text: string, msgId?: string) => Promise<void>
): YunzaiBot {
  return createYunzaiBot(botId, {}, { sendMessage })
}

/**
 * Bot 管理器
 * 管理多个 Bot 实例
 */
class BotManager {
  private bots: Map<string, YunzaiBot> = new Map()
  
  /**
   * 添加 Bot
   */
  addBot(botId: string, bot: YunzaiBot): void {
    this.bots.set(botId, bot)
  }
  
  /**
   * 获取 Bot
   */
  getBot(botId: string): YunzaiBot | undefined {
    return this.bots.get(botId)
  }
  
  /**
   * 移除 Bot
   */
  removeBot(botId: string): boolean {
    return this.bots.delete(botId)
  }
  
  /**
   * 获取所有 Bot
   */
  getAllBots(): YunzaiBot[] {
    return Array.from(this.bots.values())
  }
  
  /**
   * 获取所有 Bot ID
   */
  getAllBotIds(): string[] {
    return Array.from(this.bots.keys())
  }
  
  /**
   * 检查 Bot 是否存在
   */
  hasBot(botId: string): boolean {
    return this.bots.has(botId)
  }
  
  /**
   * 获取 Bot 数量
   */
  getBotCount(): number {
    return this.bots.size
  }
  
  /**
   * 清空所有 Bot
   */
  clear(): void {
    this.bots.clear()
  }
}

// 导出单例 Bot 管理器
export const botManager = new BotManager()
