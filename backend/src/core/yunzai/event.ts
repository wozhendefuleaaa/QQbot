/**
 * Yunzai 事件模块
 * 负责创建和管理 Yunzai 风格的事件对象
 */

import { SegmentType, YunzaiEvent, YunzaiGroup, YunzaiFriend, YunzaiMember, YunzaiRuntime } from './types.js'
import { segment, segmentToText, segmentToQQOfficial } from './segment.js'
import { cfg } from './config.js'

/**
 * 从消息文本解析消息段数组
 */
function parseMessageToSegments(text: string): SegmentType[] {
  const segments: SegmentType[] = []
  let remaining = text
  
  // 匹配 @用户 和 @[昵称](qq) 格式
  const atRegex = /@\[([^\]]*)\]\((\d+)\)|@(\d+)/g
  
  let lastIndex = 0
  let match
  
  while ((match = atRegex.exec(remaining)) !== null) {
    // 添加 @ 之前的文本
    if (match.index > lastIndex) {
      const textContent = remaining.slice(lastIndex, match.index).trim()
      if (textContent) {
        segments.push(segment.text(textContent))
      }
    }
    
    // 添加 @ 消息段
    if (match[1] && match[2]) {
      // @[昵称](qq) 格式
      segments.push(segment.at(match[2], match[1]))
    } else if (match[3]) {
      // @qq 格式
      segments.push(segment.at(match[3]))
    }
    
    lastIndex = match.index + match[0].length
  }
  
  // 添加剩余文本
  if (lastIndex < remaining.length) {
    const textContent = remaining.slice(lastIndex).trim()
    if (textContent) {
      segments.push(segment.text(textContent))
    }
  }
  
  // 如果没有解析出任何消息段，返回原始文本
  if (segments.length === 0 && text.trim()) {
    segments.push(segment.text(text))
  }
  
  return segments
}

/**
 * 创建 Yunzai 风格的事件对象
 */
export function createYunzaiEvent(
  messageEvent: any,
  botId: string,
  sendMessage: (targetId: string, targetType: 'user' | 'group', text: string, msgId?: string) => Promise<void>,
  getGuildId?: (groupId: string) => string | undefined
): YunzaiEvent {
  const { author, content, group_id, guild_id, channel_id, id: message_id, attachments, mentions } = messageEvent
  
  // 解析消息内容为消息段
  const messageSegments = parseMessageToSegments(content || '')
  
  // 解析 @ 用户列表
  const atUser = (mentions || []).map((m: any) => ({
    id: m.id,
    name: m.username || '',
    avatar: m.avatar || ''
  }))
  
  // 判断消息类型
  const isGroup = !!(group_id || guild_id)
  const isPrivate = !isGroup
  
  // 创建用户信息
  const user_id = author?.id || ''
  const user_name = author?.username || ''
  
  // 创建群组对象
  let group: YunzaiGroup | undefined
  if (isGroup) {
    const actualGroupId = group_id || channel_id || ''
    group = {
      group_id: actualGroupId,
      group_name: messageEvent.group_name || '',
      guild_id: guild_id || (getGuildId ? getGuildId(actualGroupId) : undefined),
      sendMsg: async (msg: string | SegmentType | SegmentType[]) => {
        const text = typeof msg === 'string' ? msg : segmentToText(msg)
        await sendMessage(actualGroupId, 'group', text)
      },
      pickMember: (userId: string): YunzaiMember => ({
        user_id: userId,
        nickname: '',
        card: '',
        role: 'member',
        info: {}
      })
    }
  }
  
  // 创建好友对象
  let friend: YunzaiFriend | undefined
  if (isPrivate) {
    friend = {
      user_id,
      nickname: user_name,
      sendMsg: async (msg: string | SegmentType | SegmentType[]) => {
        const text = typeof msg === 'string' ? msg : segmentToText(msg)
        await sendMessage(user_id, 'user', text)
      }
    }
  }
  
  // 创建成员对象
  let member: YunzaiMember | undefined
  if (isGroup) {
    member = {
      user_id,
      nickname: user_name,
      card: messageEvent.member?.nick || '',
      role: messageEvent.member?.roles?.includes('admin') ? 'admin' : 
            messageEvent.member?.roles?.includes('owner') ? 'owner' : 'member',
      info: messageEvent.member || {}
    }
  }
  
  // 创建运行时对象
  const runtime: YunzaiRuntime = {
    cfg,
    handler: {
      has: (key: string) => false,
      call: async (key: string, e: any, args?: any) => null,
      callAll: async (key: string, e: any, args?: any) => null
    },
    render: async (plugin: string, path: string, data?: any, cfg?: any) => {
      // 简化的渲染实现
      console.log(`[Yunzai] Render called: ${plugin}/${path}`)
      return null
    },
    initUser: async () => {
      // 用户初始化
    }
  }
  
  // 创建事件对象
  const e: YunzaiEvent = {
    // 基础信息
    user_id,
    self_id: botId,
    message_id: message_id || '',
    message: messageSegments,
    raw_message: content || '',
    msg: content || '',
    time: Math.floor(Date.now() / 1000),
    
    // 消息类型
    message_type: isGroup ? 'group' : 'private',
    sub_type: isGroup ? 'normal' : 'friend',
    post_type: 'message',
    
    // 群组信息
    group_id: isGroup ? (group_id || channel_id || '') : undefined,
    group_name: messageEvent.group_name || '',
    group,
    guild_id,
    channel_id,
    
    // 私聊信息
    friend,
    
    // 成员信息
    member,
    
    // 用户信息
    sender: {
      user_id,
      nickname: user_name,
      card: messageEvent.member?.nick || '',
      role: member?.role || 'member'
    },
    
    // 类型标识
    isGroup,
    isPrivate,
    
    // @ 用户列表
    atUser,
    at: atUser.length > 0,
    hasAlias: false,
    
    // 消息段
    segments: messageSegments,
    
    // 原始事件
    originalEvent: messageEvent,
    
    // 运行时
    runtime,
    
    // 回复方法
    reply: async (msg: any, quote: boolean = false, options: any = {}) => {
      const text = typeof msg === 'string' ? msg : segmentToText(msg)
      const targetId = isGroup ? (group_id || channel_id || '') : user_id
      const targetType = isGroup ? 'group' : 'user'
      
      await sendMessage(targetId, targetType, text, options.msgId)
      return { message_id: '' }
    },
    
    // 回复消息方法
    replyMsg: async (msg: any) => {
      const text = typeof msg === 'string' ? msg : segmentToText(msg)
      const targetId = isGroup ? (group_id || channel_id || '') : user_id
      const targetType = isGroup ? 'group' : 'user'
      
      await sendMessage(targetId, targetType, text)
      return { message_id: '' }
    },
    
    // 获取 @ 用户列表
    getAtUser: () => atUser.map((u: { id: string }) => u.id),
    
    // 是否有 @
    hasAt: () => atUser.length > 0,
    
    // 是否 @ 指定用户
    isAt: (userId: string) => atUser.some((u: { id: string }) => u.id === userId),
    
    // 日志方法
    log: {
      info: (...args: any[]) => console.log('[Yunzai]', ...args),
      warn: (...args: any[]) => console.warn('[Yunzai]', ...args),
      error: (...args: any[]) => console.error('[Yunzai]', ...args),
      debug: (...args: any[]) => console.debug('[Yunzai]', ...args)
    }
  }
  
  return e
}

/**
 * 创建频道消息事件
 */
export function createGuildMessageEvent(
  messageEvent: any,
  botId: string,
  sendMessage: (targetId: string, targetType: 'user' | 'group', text: string, msgId?: string) => Promise<void>
): YunzaiEvent {
  const event = createYunzaiEvent(messageEvent, botId, sendMessage)
  
  // 覆盖频道特有属性
  event.guild_id = messageEvent.guild_id
  event.channel_id = messageEvent.channel_id
  event.sub_type = 'guild'
  
  return event
}

/**
 * 创建私聊消息事件
 */
export function createPrivateMessageEvent(
  messageEvent: any,
  botId: string,
  sendMessage: (targetId: string, targetType: 'user' | 'group', text: string, msgId?: string) => Promise<void>
): YunzaiEvent {
  const event = createYunzaiEvent(messageEvent, botId, sendMessage)
  
  // 覆盖私聊特有属性
  event.message_type = 'private'
  event.sub_type = 'friend'
  
  return event
}

/**
 * 创建群消息事件
 */
export function createGroupMessageEvent(
  messageEvent: any,
  botId: string,
  sendMessage: (targetId: string, targetType: 'user' | 'group', text: string, msgId?: string) => Promise<void>,
  getGuildId?: (groupId: string) => string | undefined
): YunzaiEvent {
  const event = createYunzaiEvent(messageEvent, botId, sendMessage, getGuildId)
  
  // 覆盖群消息特有属性
  event.message_type = 'group'
  event.sub_type = 'normal'
  
  return event
}
