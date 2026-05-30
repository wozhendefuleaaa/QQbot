# Wawa-QQBot 插件开发指南

> 支持 TypeScript/JavaScript、云崽(Yunzai) 插件、Python 三种开发方式

---

## 目录

1. [快速开始](#快速开始)
2. [TypeScript/JS 标准插件](#typescriptjs-标准插件)
3. [云崽 (Yunzai) 插件](#云崽-yunzai-插件)
4. [Python 插件](#python-插件)
5. [插件 API 参考](#插件-api-参考)
6. [命令系统](#命令系统)
7. [生命周期](#生命周期)
8. [定时任务](#定时任务)
9. [权限控制](#权限控制)
10. [调试与部署](#调试与部署)

---

## 快速开始

### 文件位置

所有插件文件放在 `backend/src/plugins/` 或 `backend/plugins/` 目录下：

```
backend/src/plugins/
├── my-plugin.ts          # TypeScript 标准插件
├── my-yunzai-plugin.ts   # 云崽风格插件
├── my-python-plugin.py   # Python 插件
└── my-plugin-package/    # 包形式插件
    ├── index.js
    ├── package.json
    └── apps/
        └── feature.js
```

### 支持的文件格式

| 格式 | 说明 |
|------|------|
| `.ts` / `.js` / `.mjs` | 标准插件（实现 Plugin 接口） |
| `.ts` / `.js` (yunzai) | 云崽插件（使用 rule 规则匹配） |
| `.py` | Python 插件（通过子进程通信） |

---

## TypeScript/JS 标准插件

### 基本结构

```typescript
import { Plugin, PluginContext, MessageEvent } from '../core/plugin-types.js';

const myPlugin: Plugin = {
  // ===== 元数据 =====
  id: 'my-plugin',             // 唯一标识，必填
  name: '我的插件',             // 显示名称，必填
  version: '1.0.0',            // 版本号，必填
  description: '插件功能描述',  // 描述，必填
  author: 'Your Name',         // 作者
  enabled: true,               // 是否启用
  priority: 100,               // 优先级（数字越小越先执行）

  // ===== 生命周期 =====
  onLoad: async (ctx) => {
    ctx.log('info', '插件已加载');
  },
  onUnload: async () => {
    console.log('插件已卸载');
  },

  // ===== 消息处理 =====
  onMessage: async (event, ctx) => {
    if (event.isGroup) {
      ctx.log('info', `收到群消息: ${event.message.text}`);
    }
    return false; // false=继续传递, true=拦截
  },

  // ===== 命令 =====
  commands: [
    {
      name: 'hello',
      aliases: ['hi', '你好'],
      description: '打招呼',
      handler: async (args, event, ctx) => {
        const name = args[0] || '朋友';
        return `你好，${name}！`;  // 返回字符串会自动发送
      }
    }
  ]
};

export default myPlugin;
```

### 完整示例：天气查询插件

```typescript
import { Plugin, PluginContext, MessageEvent } from '../core/plugin-types.js';

const weatherPlugin: Plugin = {
  id: 'weather-query',
  name: '天气查询',
  version: '1.0.0',
  description: '查询指定城市的天气信息',
  author: 'Developer',
  enabled: true,
  priority: 100,

  onMessage: async (event, ctx) => {
    const text = event.message.text;

    // 自动响应关键词
    if (text.includes('天气')) {
      await ctx.sendMessage(
        event.isGroup ? event.groupId! : event.senderId,
        event.isGroup ? 'group' : 'user',
        '请使用 /weather <城市名> 查询天气'
      );
      return true;
    }
    return false;
  },

  commands: [
    {
      name: 'weather',
      aliases: ['天气'],
      description: '查询天气',
      usage: '/weather <城市名>',
      cooldown: 10,
      handler: async (args, event, ctx) => {
        if (args.length === 0) {
          return '请指定城市名，例如：/weather 北京';
        }
        const city = args.join(' ');
        ctx.log('info', `查询天气: ${city}`);

        try {
          const response = await fetch(`https://api.weather.com/${encodeURIComponent(city)}`);
          const data = await response.json();
          return `${city}天气：${data.temp}°C，${data.desc}`;
        } catch {
          return `查询 ${city} 天气失败，请稍后重试`;
        }
      }
    }
  ],

  // 定时任务：每天早上 8 点推送天气
  cronJobs: [
    {
      pattern: '0 8 * * *',
      handler: async (ctx) => {
        ctx.log('info', '定时任务：推送每日天气');
        // await ctx.sendMessage(targetId, 'group', '今日天气...');
      }
    }
  ]
};

export default weatherPlugin;
```

### 使用富媒体消息 (NEW)

```typescript
// 使用 ctx.sendRichMessage 发送富文本
commands: [
  {
    name: 'welcome',
    description: '发送欢迎消息',
    handler: async (_args, event, ctx) => {
      await ctx.sendRichMessage(
        event.isGroup ? event.groupId! : event.senderId,
        event.isGroup ? 'group' : 'user',
        (b) => b.text('欢迎 ').at(event.senderId).text('！')
      );
    }
  },
  // 发送 Markdown 消息
  {
    name: 'announce',
    permission: 'admin',
    description: '发送公告',
    handler: async (args, _event, ctx) => {
      await ctx.sendMarkdown(
        'group-123', 'group',
        {
          custom_template_id: 'announce_tmpl',
          params: [
            { key: 'title', values: ['重要通知'] },
            { key: 'content', values: [args.join(' ')] }
          ]
        }
      );
    }
  }
]
```

---

## 云崽 (Yunzai) 插件

云崽插件使用类定义 + `rule` 规则匹配表，兼容 Yunzai-Bot 生态。

### 基本结构

```typescript
export class MyYunzaiPlugin {
  name = '我的云崽插件';
  dsc = '插件描述';
  event = 'message';
  priority = 1000;
  enable = true;

  // 规则表：正则匹配 → 方法名
  rule = [
    { reg: '^#功能1$',      fnc: 'func1', describe: '功能1描述' },
    { reg: '^#功能2 (.+)$', fnc: 'func2', describe: '功能2描述' },
  ];

  async func1(e: any): Promise<boolean> {
    await e.reply('功能1已执行！');
    return true;
  }

  async func2(e: any): Promise<boolean> {
    const match = e.raw_message?.match(/^#功能2 (.+)$/);
    if (match) {
      await e.reply(`参数: ${match[1]}`);
      return true;
    }
    return false;
  }
}

export default MyYunzaiPlugin;
```

### 规则 (rule) 定义

```typescript
type Rule = {
  reg: string | RegExp;       // 正则表达式，匹配消息内容
  atBot?: boolean;            // 是否需要 @机器人 才触发
  fnc: string;                 // 对应的方法名
  describe?: string;           // 功能描述（帮助信息）
};
```

### e 事件对象

云崽插件方法接收的 `e` 对象提供：

| 属性/方法 | 说明 |
|-----------|------|
| `e.raw_message` | 原始消息文本 |
| `e.message` | 消息段数组 |
| `e.user_id` | 发送者 ID |
| `e.group_id` | 群 ID |
| `e.sender` | 发送者信息 (`{ user_id, nickname, card, role }`) |
| `e.isGroup` | 是否群消息 |
| `e.isPrivate` | 是否私聊 |
| `e.at` | 是否被 @ |
| `e.reply(msg)` | 回复消息 |
| `e.replyMsg(msg)` | 回复消息（不引用） |

### 使用 segment 构建富消息

```typescript
async sendRich(e: any): Promise<boolean> {
  // 通过 globalThis 访问 segment 和 MessageBuilder
  const { segment, MessageBuilder } = globalThis as any;

  // 方式1：segment 工厂函数
  const img = segment.image('https://example.com/photo.jpg');
  const at = segment.at(e.user_id, e.sender.nickname);
  await e.reply([segment.text('这是一张图片: '), img]);

  // 方式2：MessageBuilder 链式构建
  const msg = new MessageBuilder()
    .reply(e.message_id)
    .text('这是回复 ')
    .at(e.user_id)
    .image('https://example.com/img.jpg')
    .build();

  // 发送
  await e.reply(msg);
  return true;
}
```

---

## Python 插件

### 基本结构

```python
from plugin_runtime import Plugin, set_plugin

class MyPlugin(Plugin):
    id = 'my-python-plugin'
    name = '我的 Python 插件'
    version = '1.0.0'
    description = 'Python 插件示例'
    author = 'Developer'
    priority = 100

    def __init__(self):
        super().__init__()
        self._setup_commands()

    def _setup_commands(self):
        @self.command(
            name='hello',
            aliases=['你好'],
            description='打招呼',
            cooldown=5
        )
        def hello_cmd(args, event, ctx):
            name = args[0] if args else event.get('senderName', '朋友')
            return f'你好，{name}！'

    def on_load(self):
        self.ctx.log('info', f'{self.name} 已加载')

    def on_unload(self):
        self.ctx.log('info', f'{self.name} 已卸载')

    def on_message(self, event):
        if 'ping' in event.get('message', '').lower():
            return True  # 拦截
        return False

plugin = MyPlugin()
set_plugin(plugin)
```

### Python 插件限制

| 能力 | 状态 |
|------|:--:|
| 文本消息发送 | ✅ |
| 命令注册 | ✅ |
| 日志记录 | ✅ |
| onLoad / onUnload | ✅ |
| onMessage | ✅ |
| Markdown 消息 | ❌（规划中） |
| 富媒体消息 | ❌（规划中） |
| 定时任务 | ❌（规划中） |

---

## 插件 API 参考

### PluginContext

插件上下文对象，通过 `onLoad(ctx)`、`onMessage(event, ctx)`、命令 handler 的 `ctx` 参数获取。

```typescript
interface PluginContext {
  // === 消息发送 ===

  /** 发送文本消息 */
  sendMessage(targetId: string, targetType: 'user' | 'group', text: string): Promise<void>;

  /** 发送富文本消息 (MessageBuilder 链式API) */
  sendRichMessage(targetId: string, targetType: 'user' | 'group',
    builderFn: (b: MessageBuilder) => unknown): Promise<void>;

  /** 发送 Markdown 消息 */
  sendMarkdown(targetId: string, targetType: 'user' | 'group',
    markdown: MarkdownPayload): Promise<void>;

  /** 回复当前消息（自动引用） */
  reply(text: string): Promise<void>;

  // === 工具 ===

  /** 记录日志到系统 */
  log(level: 'info' | 'warn' | 'error', message: string): void;

  /** 获取当前连接的账号 ID */
  getConnectedAccountId(): string | null;

  /** 获取原始消息事件 */
  getMessageEvent(): MessageEvent;
}
```

### MessageEvent

消息事件对象：

```typescript
interface MessageEvent {
  message: Message;           // 原始消息对象
  isGroup: boolean;           // 是否群消息
  senderId: string;           // 发送者 ID
  senderName?: string;        // 发送者名称
  groupId?: string;           // 群 ID (群消息时)
}
```

### MessageBuilder (富媒体构建器)

链式 API 构建复杂消息：

```typescript
// 从 SDK 导入
import { MessageBuilder } from '../core/qqbot/segment.js';

// 文本 + @ + 表情
new MessageBuilder()
  .text('Hello ')
  .at('123456', 'Name')
  .face(1)
  .build();
// → { msg_type: 0, content: "Hello @Name [表情:1]" }

// 回复 + 图片
new MessageBuilder()
  .reply('msg-123')
  .image('https://example.com/photo.jpg')
  .build();
// → { msg_type: 7, msg_id: "msg-123", media: { file_info: "..." } }

// Markdown 消息
new MessageBuilder()
  .markdown({ custom_template_id: 'tmpl_1', params: [...] })
  .build();
// → { msg_type: 2, markdown: { ... } }
```

**构建器方法清单**:

| 方法 | 说明 | 限制 |
|------|------|------|
| `.text(content)` | 纯文本 | 可重复 |
| `.at(qq, name?)` | @用户 | 可重复 |
| `.face(id)` | 表情 | 可重复 |
| `.reply(id)` | 引用回复 | 必须第一个 |
| `.image(file)` | 图片 | 独立元素 |
| `.markdown(data)` | Markdown | 独立元素 |
| `.ark(data)` | Ark卡片 | 独立元素 |
| `.embed(data)` | Embed | 独立元素 |
| `.keyboard(data)` | 键盘按钮 | 可组合 |
| `.build()` | 输出 SendMessageRequest | — |
| `.buildText()` | 输出纯文本 | — |

---

## 命令系统

### 命令定义

```typescript
{
  name: 'command-name',        // 命令名（不含前缀），必填
  aliases: ['别名1', '别名2'],  // 别名，可选
  description: '命令描述',      // 描述，必填
  usage: '/cmd <arg>',         // 用法示例
  permission: 'public',        // 权限: public | admin | owner
  cooldown: 5,                 // 冷却时间（秒）
  hidden: false,               // 是否在帮助中隐藏
  pattern: '^\\d+$',           // 正则匹配模式（高级用法）

  // 处理函数
  handler: async (args, event, ctx) => {
    // args: 命令参数数组
    // event: MessageEvent 消息事件
    // ctx: PluginContext 插件上下文
    // 返回字符串 = 自动发送给用户
    // 返回 void = 不自动发送
    return '处理结果';
  }
}
```

### 内置命令

- `/help` 或 `帮助` — 显示所有可用命令列表（自动生成）

### 命令匹配顺序

1. 精确匹配命令名（含前缀 `/cmd`）
2. 精确匹配别名
3. 无前缀匹配命令名
4. 正则 pattern 匹配

---

## 生命周期

```
启动 → loadAllPlugins()
         ├── onLoad(ctx)          ← 插件初始化（注册命令、连接数据库等）
         ├── 注册命令
         └── 注册定时任务
         ↓
运行中 → onMessage(event, ctx)   ← 每条消息
         ↓
关闭 → unloadPlugin()
         ├── 取消定时任务
         ├── onUnload()           ← 清理资源
         └── dispose()            ← 云崽插件清理
```

### 生命周期钩子详解

```typescript
{
  /** 加载：注册资源、初始化连接 */
  onLoad?: (ctx: PluginContext) => Promise<void> | void;

  /** 卸载：释放资源、关闭连接 */
  onUnload?: () => Promise<void> | void;

  /** 收到消息 */
  onMessage?: (event: MessageEvent, ctx: PluginContext) => Promise<boolean | void>;

  /** 清理云崽运行时注册内容 */
  dispose?: () => Promise<void> | void;
}
```

---

## 定时任务

使用标准 cron 表达式（5 字段）注册定时任务：

```typescript
{
  cronJobs: [
    {
      pattern: '0 8 * * *',       // 每天 8:00
      handler: async (ctx) => {
        await ctx.sendMessage('group-123', 'group', '早上好！');
      }
    },
    {
      pattern: '*/30 * * * *',    // 每 30 分钟
      handler: async (ctx) => {
        ctx.log('info', '定时检查...');
      }
    }
  ]
}
```

**Cron 表达式格式**: `分 时 日 月 周`

| 字段 | 范围 | 示例 |
|------|------|------|
| 分 | 0-59 | `0` `*/15` `30` |
| 时 | 0-23 | `8` `*/2` |
| 日 | 1-31 | `*` `1` |
| 月 | 1-12 | `*` |
| 周 | 0-6 (日=0) | `1-5`（周一到周五） |

支持 `/`（步进）、`,`（列表）、`-`（范围）。

---

## 权限控制

### 命令权限

```typescript
commands: [
  {
    name: 'admin-cmd',
    permission: 'admin',  // 仅管理员
    handler: async () => '管理员专用'
  },
  {
    name: 'owner-cmd',
    permission: 'owner',  // 仅所有者
    handler: async () => '所有者专用'
  },
  {
    name: 'public-cmd',
    permission: 'public', // 所有人可用（默认）
    handler: async () => '公开命令'
  }
]
```

权限级别：`public` < `admin` < `owner`

### 插件权限矩阵

通过 WebUI 的「配置中心 → 插件权限」可按账号+群组维度禁用特定插件：

```
账号 A
├── 群组 G1: [my-plugin] 禁用
├── 群组 G2: [] 全部启用
└── private: [sensitive-plugin] 私聊禁用
```

插件通过 `isPluginDisabled(pluginId, accountId, groupId)` 在校验阶段被跳过。

---

## 调试与部署

### 本地调试

```bash
# 1. 启动后端
cd backend && npm run dev

# 2. 放置插件文件
cp my-plugin.ts backend/src/plugins/

# 3. 查看日志（插件加载信息会在控制台输出）
# [INFO] 插件已加载: my-plugin (1.0.0)
```

### 热重载

通过 WebUI 或 API 触发热重载：

```bash
# API 方式重载插件
curl -X POST http://localhost:3000/api/plugins/my-plugin/reload
```

重载流程：卸载 → 重新读取文件 → 加载

### 上传插件到 WebUI

1. 在 WebUI 进入「插件管理」
2. 点击「上传插件」
3. 选择 `.ts` 或 `.js` 文件
4. 系统自动加载并注册

### 插件源码在线编辑

WebUI 支持在线编辑插件源码（`/api/plugins/:id/source`），修改后保存即可。

---

## 最佳实践

1. **唯一 ID**: 每个插件的 `id` 必须全局唯一，建议使用 `kebab-case`
2. **错误处理**: 在命令 handler 中使用 try-catch，异常会被记录但不会崩溃
3. **避免阻塞**: `onMessage` 尽量快速返回，耗时操作使用异步
4. **善用 ctx.log**: 记录关键操作便于排查
5. **冷却时间**: 为高频命令设置 `cooldown` 防止滥用
6. **权限分级**: 管理操作使用 `permission: 'admin'` 保护
7. **返回 false**: 在 `onMessage` 中不拦截时返回 `false`，让其他插件继续处理

---

## 从其他框架迁移

### 从 Yunzai-Bot 迁移

```diff
- import plugin from '../../../lib/plugin.js';
- export class MyPlugin extends plugin {
+ // 直接使用，无需修改！系统自动识别 rule 规则表
+ export class MyPlugin {
    name = 'my-plugin';
-   /** @type {import('yunzai').Rule[]} */
    rule = [
      { reg: '^#test$', fnc: 'test' }
    ];
    async test(e) {
      await e.reply('ok');
    }
  }
```

### 从 NoneBot2 迁移

NoneBot 插件可以转换为标准 Plugin 接口：

```typescript
// NoneBot2 风格
// @on_command("hello")
// async def hello(args):
//     await hello.finish("Hi!")

// Wawa-QQBot 等价写法
const plugin: Plugin = {
  id: 'hello-plugin',
  commands: [{
    name: 'hello',
    handler: async () => 'Hi!'
  }]
};
```

---

## 更多资源

- [QQ 机器人官方 API 文档](https://bot.q.qq.com/wiki/develop/api-v2/)
- [Yunzai 适配器说明](backend/src/plugins/YUNZAI_ADAPTER.md)
- [Python 插件开发详解](backend/src/plugins/PYTHON_PLUGIN_GUIDE.md)
- [SDK API 参考](backend/src/core/qqbot/)
