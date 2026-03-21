# Yunzai 插件适配器

本项目实现了对 Yunzai（云崽）插件系统的完全兼容，允许 Yunzai 插件在本项目中直接运行。

## 模块化架构

适配器已重构为模块化架构，位于 `backend/src/core/yunzai/` 目录：

```
backend/src/core/yunzai/
├── index.ts      # 主入口，导出所有模块
├── types.ts      # 类型定义
├── config.ts     # 配置管理
├── segment.ts    # 消息段构建器
├── handler.ts    # 事件处理器系统
├── plugin.ts     # 插件基类
├── event.ts      # 事件对象创建
└── bot.ts        # Bot 对象管理
```

## 快速开始

### 导入适配器

```typescript
import {
  YunzaiPlugin,
  segment,
  Handler,
  cfg,
  createYunzaiEvent,
  createYunzaiBot,
  initYunzaiGlobals,
  isYunzaiPlugin,
  loadYunzaiPlugin,
  convertYunzaiPlugin
} from './core/yunzai/index.js';
```

### 创建 Yunzai 插件

```javascript
import { YunzaiPlugin, segment } from './core/yunzai/index.js';

export class MyPlugin extends YunzaiPlugin {
  constructor() {
    super({
      name: '我的插件',
      dsc: '插件描述',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#测试$',
          fnc: 'test'
        }
      ]
    });
  }

  async test() {
    await this.reply('测试成功！');
    return true;
  }
}
```

## 核心模块说明

### types.ts - 类型定义

定义了所有 Yunzai 相关的 TypeScript 类型：

- `YunzaiConfig` - 配置类型
- `SegmentType` - 消息段类型
- `YunzaiEvent` - 事件对象类型
- `YunzaiBot` - Bot 对象类型
- `YunzaiPlugin` - 插件基类类型
- `YunzaiRule` - 规则定义类型
- `YunzaiTask` - 定时任务类型

### config.ts - 配置管理

提供 Yunzai 风格的配置管理：

```typescript
import { cfg, initYunzaiConfig, isMaster, isAdmin } from './core/yunzai/index.js';

// 初始化配置
initYunzaiConfig();

// 检查权限
if (isMaster(userId)) {
  // 主人权限
}

// 获取群配置
const groupCfg = cfg.getGroup(botId, groupId);
```

### segment.ts - 消息段构建器

提供消息段构建功能：

```typescript
import { segment, segmentToText, segmentsToQQOfficial } from './core/yunzai/index.js';

// 构建消息
const messages = [
  segment.text('你好'),
  segment.at('123456789'),
  segment.image('https://example.com/image.png')
];

// 转换为文本
const text = segmentToText(messages);

// 转换为 QQ 官方格式
const qqMessages = segmentsToQQOfficial(messages);
```

支持的消息段类型：
- `text` - 文本
- `image` - 图片
- `at` - @用户
- `reply` - 回复
- `face` - 表情
- `record` - 语音
- `video` - 视频
- `json` - JSON 消息
- `xml` - XML 消息
- `poke` - 戳一戳
- `forward` - 转发消息
- `node` - 合并消息节点
- `button` - 按钮
- `markdown` - Markdown 消息

### handler.ts - 事件处理器系统

实现 Yunzai 的事件处理器机制：

```typescript
import { Handler, createRuntimeHandler } from './core/yunzai/index.js';

// 添加处理器
Handler.add({
  ns: 'my-plugin',
  key: 'message.receive',
  fn: async (e) => {
    // 处理事件
  },
  priority: 100
});

// 调用处理器
await Handler.call('message.receive', event);

// 创建运行时 handler
const runtimeHandler = createRuntimeHandler();
```

### plugin.ts - 插件基类

提供 Yunzai 插件基类：

```typescript
import { YunzaiPlugin } from './core/yunzai/index.js';

class MyPlugin extends YunzaiPlugin {
  constructor() {
    super({
      name: '插件名称',
      dsc: '插件描述',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: '^#命令$', fnc: 'commandHandler' }
      ],
      task: [
        { name: '定时任务', cron: '0 0 * * *', fnc: 'scheduledTask' }
      ],
      handler: [
        { key: 'event.name', fn: 'eventHandler' }
      ]
    });
  }

  async commandHandler() {
    await this.reply('命令响应');
  }

  async scheduledTask() {
    console.log('定时任务执行');
  }

  async eventHandler(e) {
    // 处理事件
  }
}
```

插件基类提供的方法：
- `reply(msg, quote?, data?)` - 回复消息
- `conKey(isGroup?)` - 获取上下文 key
- `setContext(type, isGroup?, time?, timeout?)` - 设置上下文
- `getContext(type?, isGroup?)` - 获取上下文
- `finish(type?, isGroup?)` - 完成上下文
- `awaitContext(...args)` - 等待上下文
- `renderImg(plugin, tpl, data, cfg)` - 渲染图片

### event.ts - 事件对象

创建 Yunzai 风格的事件对象：

```typescript
import { createYunzaiEvent, createGroupMessageEvent, createPrivateMessageEvent } from './core/yunzai/index.js';

// 创建通用事件
const event = createYunzaiEvent(
  messageEvent,  // 原始消息事件
  botId,         // Bot ID
  sendMessage    // 发送消息函数
);

// 创建群消息事件
const groupEvent = createGroupMessageEvent(messageEvent, botId, sendMessage);

// 创建私聊消息事件
const privateEvent = createPrivateMessageEvent(messageEvent, botId, sendMessage);
```

事件对象属性：
- `user_id` - 用户 ID
- `group_id` - 群 ID（群消息）
- `message` - 消息内容
- `raw_message` - 原始消息
- `sender` - 发送者信息
- `reply()` - 回复方法
- `isGroup` - 是否群消息
- `isPrivate` - 是否私聊
- `atUser` - @用户列表
- `runtime` - 运行时对象

### bot.ts - Bot 对象管理

创建和管理 Bot 实例：

```typescript
import { createYunzaiBot, botManager } from './core/yunzai/index.js';

// 创建 Bot
const bot = createYunzaiBot('bot-id', {
  name: 'Bot名称'
}, {
  sendMessage: async (targetId, targetType, text) => {
    // 发送消息实现
  },
  getGroupList: async () => [],
  // ... 其他 API
});

// 使用 Bot 管理器
botManager.addBot('bot-id', bot);
const existingBot = botManager.getBot('bot-id');
```

Bot 对象提供的方法：
- `sendPrivateMsg(userId, message)` - 发送私聊消息
- `sendGroupMsg(groupId, message)` - 发送群消息
- `getGroupList()` - 获取群列表
- `getFriendList()` - 获取好友列表
- `pickMember(groupId, userId)` - 获取群成员
- `pickGroup(groupId)` - 获取群
- `pickFriend(userId)` - 获取好友
- `setGroupBan(groupId, userId, duration)` - 禁言
- `deleteMsg(messageId)` - 撤回消息

## 全局对象初始化

在使用 Yunzai 插件前，需要初始化全局对象：

```typescript
import { initYunzaiGlobals, createYunzaiBot } from './core/yunzai/index.js';

// 创建 Bot
const bot = createYunzaiBot('bot-id', {}, api);

// 初始化全局对象
initYunzaiGlobals(bot);

// 现在可以在插件中使用全局对象
// globalThis.Bot
// globalThis.segment
// globalThis.Handler
// globalThis.cfg
```

## 插件加载流程

1. 检测插件是否为 Yunzai 格式（`isYunzaiPlugin`）
2. 创建 Bot 对象和事件对象
3. 初始化全局对象（`initYunzaiGlobals`）
4. 加载插件（`loadYunzaiPlugin`）
5. 转换为内部插件格式（`convertYunzaiPlugin`）
6. 注册命令和处理器

## 兼容性说明

### 完全兼容

- ✅ 插件基类（YunzaiPlugin）
- ✅ 消息段构建器（segment）
- ✅ 事件处理器系统（Handler）
- ✅ 配置管理（cfg）
- ✅ 上下文管理（setContext/getContext/finish）
- ✅ 权限系统（isMaster/isAdmin）
- ✅ Bot 对象 API
- ✅ 事件对象属性

### 部分兼容

- ⚠️ 渲染功能（renderImg）- 需要额外配置 Puppeteer
- ⚠️ 米游社相关功能 - 需要安装 MysInfo 模块

### 不兼容

- ❌ 原生 ICQQ 协议相关功能
- ❌ Yunzai 原生数据库操作

## 示例插件

参考 `plugins/example-yunzai-plugin.ts` 查看完整的示例插件。

## 从 Yunzai 迁移

1. 将插件文件复制到 `plugins/` 目录
2. 确保插件使用 ES Module 格式（`export class`）
3. 插件会自动被识别并加载

## 注意事项

1. 插件文件需要使用 `.js` 或 `.ts` 扩展名
2. 插件类需要继承 `YunzaiPlugin`
3. 规则匹配使用正则表达式
4. 异步操作需要使用 `async/await`
5. 权限检查使用 `isMaster()` 和 `isAdmin()`

## 更新日志

### v2.0.0
- 重构为模块化架构
- 拆分为多个独立模块
- 改进类型定义
- 优化事件对象创建
- 增强 Bot 对象功能
- 完善文档
