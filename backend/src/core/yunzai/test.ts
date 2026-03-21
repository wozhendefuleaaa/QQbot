/**
 * Yunzai 适配器测试文件
 * 测试所有模块的功能
 */

import {
  segment,
  parseMessageToSegments,
  segmentToText,
  segmentToQQOfficial,
  segmentsToQQOfficial,
  Handler,
  YunzaiPlugin,
  createYunzaiBot,
  createYunzaiEvent,
  createGroupMessageEvent,
  createPrivateMessageEvent,
  initYunzaiGlobals,
  isMaster,
  isAdmin,
  cfg
} from './index.js'

console.log('=== Yunzai 适配器测试开始 ===\n')

// 测试计数
let passed = 0
let failed = 0

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      console.log(`✅ ${name}`)
      passed++
    } else {
      console.log(`❌ ${name} - 断言失败`)
      failed++
    }
  } catch (error: any) {
    console.log(`❌ ${name} - 异常: ${error.message}`)
    failed++
  }
}

// ==================== Segment 测试 ====================
console.log('--- Segment 模块测试 ---')

test('segment.text() 创建文本消息', () => {
  const seg = segment.text('你好世界')
  return seg.type === 'text' && seg.text === '你好世界'
})

test('segment.image() 创建图片消息', () => {
  const seg = segment.image('https://example.com/image.png')
  return seg.type === 'image' && seg.file === 'https://example.com/image.png'
})

test('segment.at() 创建@消息', () => {
  const seg = segment.at('123456', '测试用户')
  return seg.type === 'at' && seg.qq === '123456' && seg.name === '测试用户'
})

test('segment.reply() 创建回复消息', () => {
  const seg = segment.reply('msg_123')
  return seg.type === 'reply' && seg.id === 'msg_123'
})

test('segment.face() 创建表情消息', () => {
  const seg = segment.face(1)
  return seg.type === 'face' && seg.id === 1
})

test('segment.record() 创建语音消息', () => {
  const seg = segment.record('https://example.com/audio.mp3')
  return seg.type === 'record' && seg.file === 'https://example.com/audio.mp3'
})

test('segment.video() 创建视频消息', () => {
  const seg = segment.video('https://example.com/video.mp4')
  return seg.type === 'video' && seg.file === 'https://example.com/video.mp4'
})

test('segment.json() 创建JSON消息', () => {
  const seg = segment.json({ app: 'test' })
  return seg.type === 'json' && typeof seg.data === 'string'
})

test('segment.xml() 创建XML消息', () => {
  const seg = segment.xml('<xml>test</xml>')
  return seg.type === 'xml' && seg.data === '<xml>test</xml>'
})

test('parseMessageToSegments() 解析文本消息', () => {
  const segs = parseMessageToSegments('你好世界')
  return segs.length === 1 && segs[0].type === 'text'
})

test('segmentToText() 转换文本消息', () => {
  const seg = segment.text('测试文本')
  const text = segmentToText(seg)
  return text === '测试文本'
})

test('segmentToQQOfficial() 转换文本消息为QQ官方格式', () => {
  const seg = segment.text('你好')
  const official = segmentToQQOfficial(seg)
  return official.type === 'text' && official.text === '你好'
})

test('segmentToQQOfficial() 转换@消息为QQ官方格式', () => {
  const seg = segment.at('123456')
  const official = segmentToQQOfficial(seg)
  return official.type === 'mention_user' && official.user_id === '123456'
})

test('segmentsToQQOfficial() 批量转换消息', () => {
  const segs = [segment.text('你好'), segment.at('123456')]
  const officials = segmentsToQQOfficial(segs)
  return Array.isArray(officials) && officials.length === 2
})

// ==================== Handler 测试 ====================
console.log('\n--- Handler 模块测试 ---')

test('Handler.add() 添加处理器', () => {
  Handler.add({
    ns: 'test',
    key: 'testHandler',
    fn: () => 'test result',
    priority: 100
  })
  return Handler.has('testHandler')
})

test('Handler.has() 检查处理器存在', () => {
  return Handler.has('testHandler')
})

test('Handler.get() 获取处理器', () => {
  const handlers = Handler.get('testHandler')
  return Array.isArray(handlers) && handlers.length > 0
})

test('Handler.del() 删除处理器', () => {
  Handler.del('test', 'testHandler')
  return !Handler.has('test.testHandler')
})

// ==================== YunzaiPlugin 测试 ====================
console.log('\n--- YunzaiPlugin 模块测试 ---')

class TestPlugin extends YunzaiPlugin {
  constructor() {
    super({
      name: '测试插件',
      dsc: '用于测试的插件',
      event: 'message.group',
      priority: 100,
      rule: [
        {
          reg: '^#测试$',
          fnc: 'testCommand'
        }
      ]
    })
  }

  async testCommand() {
    await this.reply('测试成功')
    return true
  }
}

const testPlugin = new TestPlugin()

test('YunzaiPlugin 构造函数正确设置属性', () => {
  return testPlugin.name === '测试插件' &&
         testPlugin.dsc === '用于测试的插件' &&
         testPlugin.event === 'message.group' &&
         testPlugin.priority === 100
})

test('YunzaiPlugin rule 正确设置', () => {
  return testPlugin.rule.length === 1 &&
         testPlugin.rule[0].reg === '^#测试$' &&
         testPlugin.rule[0].fnc === 'testCommand'
})

test('YunzaiPlugin conKey() 生成正确的key', () => {
  const key = testPlugin.conKey()
  return typeof key === 'string' && key.includes('测试插件')
})

// ==================== Bot 测试 ====================
console.log('\n--- Bot 模块测试 ---')

const mockBot = createYunzaiBot(
  'test_bot',
  { name: '测试机器人' },
  {
    sendMessage: async () => {}
  }
)

test('createYunzaiBot() 创建Bot实例', () => {
  return mockBot.uin === 'test_bot' && mockBot.nickname === '测试机器人'
})

test('Bot.uin 返回正确的ID', () => {
  return mockBot.uin === 'test_bot'
})

test('Bot.pickGroup() 返回群组对象', () => {
  const group = mockBot.pickGroup('group_123')
  return group.group_id === 'group_123'
})

test('Bot.pickFriend() 返回好友对象', () => {
  const friend = mockBot.pickFriend('user_456')
  return friend.user_id === 'user_456'
})

test('Bot.pickMember() 返回成员对象', () => {
  const member = mockBot.pickMember('group_123', 'user_456')
  return member.user_id === 'user_456'
})

test('Bot.makeForwardMsg() 创建转发消息', () => {
  const forward = mockBot.makeForwardMsg([{ message: '测试消息' }])
  return forward.type === 'forward' && Array.isArray(forward.data)
})

// ==================== Event 测试 ====================
console.log('\n--- Event 模块测试 ---')

const mockMessageEvent = {
  id: 'msg_001',
  author: {
    id: 'user_123',
    username: '测试用户',
    avatar: ''
  },
  content: '你好世界',
  timestamp: Date.now().toString(),
  channel_id: 'channel_001',
  guild_id: 'guild_001',
  mentions: []
}

test('createYunzaiEvent() 创建事件对象', () => {
  const event = createYunzaiEvent(mockMessageEvent, 'test_bot', async () => {})
  return event.user_id === 'user_123' &&
         event.message_id === 'msg_001' &&
         event.raw_message === '你好世界'
})

test('createGroupMessageEvent() 创建群消息事件', () => {
  const event = createGroupMessageEvent(mockMessageEvent, 'test_bot', async () => {})
  return event.group_id === 'channel_001'
})

test('createPrivateMessageEvent() 创建私聊消息事件', () => {
  const event = createPrivateMessageEvent(mockMessageEvent, 'test_bot', async () => {})
  return event.user_id === 'user_123'
})

// ==================== Config 测试 ====================
console.log('\n--- Config 模块测试 ---')

test('cfg 对象存在', () => {
  return typeof cfg === 'object'
})

test('cfg.master 返回对象', () => {
  const masters = cfg.master
  return typeof masters === 'object'
})

test('cfg.masterQQ 返回数组', () => {
  const masterQQ = cfg.masterQQ
  return Array.isArray(masterQQ)
})

test('isMaster() 函数存在', () => {
  return typeof isMaster === 'function'
})

test('isAdmin() 函数存在', () => {
  return typeof isAdmin === 'function'
})

// ==================== 全局初始化测试 ====================
console.log('\n--- 全局初始化测试 ---')

test('initYunzaiGlobals() 初始化全局对象', () => {
  initYunzaiGlobals(mockBot)
  return (globalThis as any).Bot === mockBot &&
         typeof (globalThis as any).segment === 'object' &&
         typeof (globalThis as any).Handler === 'object'
})

// ==================== 测试结果汇总 ====================
console.log('\n=== 测试结果汇总 ===')
console.log(`通过: ${passed}`)
console.log(`失败: ${failed}`)
console.log(`总计: ${passed + failed}`)

if (failed === 0) {
  console.log('\n🎉 所有测试通过！')
  process.exit(0)
} else {
  console.log('\n⚠️ 部分测试失败，请检查实现')
  process.exit(1)
}
