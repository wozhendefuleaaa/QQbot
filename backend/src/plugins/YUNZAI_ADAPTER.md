# 云崽插件适配器

本系统支持直接加载云崽插件，无需修改即可运行。

## 支持的插件格式

### 1. 单文件插件 (.js/.mjs)

将云崽插件文件直接放入 `backend/src/plugins/` 目录：

```javascript
// example-plugin.js
export class MyPlugin {
  name = '我的插件';
  dsc = '插件描述';
  event = 'message';
  priority = 1000;
  
  rule = [
    {
      reg: '^#测试$',
      fnc: 'test',
      describe: '测试命令'
    }
  ];
  
  async test(e) {
    await e.reply('测试成功！');
    return true;
  }
}
```

### 2. 插件包目录

云崽插件包格式，放入 `backend/src/plugins/` 目录：

```
plugins/
└── my-plugin/           # 插件目录名
    ├── index.js         # 入口文件（或 main.js, app.js）
    ├── apps/            # 多插件目录
    │   ├── plugin1.js
    │   └── plugin2.js
    └── package.json     # 可选，元数据
```

## 云崽 API 支持

### 事件对象 (e)

```javascript
{
  message_id: string,      // 消息ID
  raw_message: string,     // 原始消息
  message: string,         // 消息文本
  user_id: string,         // 发送者ID
  sender: {
    user_id: string,
    nickname: string,
    card: string,
    role: 'owner' | 'admin' | 'member'
  },
  group_id: string,        // 群ID（群消息）
  isGroup: boolean,        // 是否群消息
  isPrivate: boolean,      // 是否私聊
  atBot: boolean,          // 是否@机器人
  atUser: string[],        // @的成员列表
  
  // 方法
  reply: async (msg, quote?) => {},  // 回复消息
  replyMsg: async (msg) => {},       // 发送消息
  getAtUser: () => string[],         // 获取@成员
  hasAt: () => boolean,              // 是否有@
  isAt: (userId) => boolean          // 是否@了指定用户
}
```

### segment 消息构建器

```javascript
// 全局可用
segment.text('文本')
segment.image('图片URL')
segment.at('用户ID', '用户名')
segment.reply('消息ID')
segment.face(表情ID)
segment.record('语音文件')
segment.video('视频文件')
segment.json('JSON数据')
segment.xml('XML数据')
```

### 规则匹配

```javascript
rule = [
  {
    reg: '^#命令$',       // 正则匹配
    fnc: 'handler',       // 处理函数名
    atBot: false,         // 是否需要@机器人
    describe: '命令描述'
  }
]
```

### 权限控制

云崽插件支持三级权限：

| 权限级别 | 说明 |
|---------|------|
| `master` | 仅主人可用 |
| `admin` | 管理员和主人可用 |
| `all` | 所有人可用（默认） |

```javascript
rule = [
  {
    reg: '^#管理$',
    fnc: 'admin',
    permission: 'master'  // 仅主人可用
  },
  {
    reg: '^#公告$',
    fnc: 'announce',
    permission: 'admin'   // 管理员和主人可用
  },
  {
    reg: '^#帮助$',
    fnc: 'help',
    permission: 'all'     // 所有人可用
  }
]
```

### 配置主人和管理员

#### 方式一：环境变量

```bash
# 设置主人（多个用逗号分隔）
YUNZAI_MASTER_IDS=123456789,987654321

# 设置管理员（多个用逗号分隔）
YUNZAI_ADMIN_IDS=111111111,222222222
```

#### 方式二：代码配置

```javascript
import { setPermissionConfig, addMaster, addAdmin } from './core/yunzai-adapter.js';

// 批量设置
setPermissionConfig({
  masterIds: ['123456789', '987654321'],
  adminIds: ['111111111', '222222222']
});

// 动态添加
addMaster('123456789');
addAdmin('111111111');
```

#### 方式三：运行时 API

通过 API 接口动态管理权限（需要实现对应的路由）。

## 示例插件

### 基础示例

```javascript
export class HelloPlugin {
  name = '你好插件';
  dsc = '简单的打招呼插件';
  event = 'message';
  priority = 1000;
  
  rule = [
    {
      reg: '^#你好$',
      fnc: 'hello'
    }
  ];
  
  async hello(e) {
    await e.reply('你好！有什么可以帮助你的？');
    return true;
  }
}
```

### 使用 segment

```javascript
export class ImagePlugin {
  name = '图片插件';
  
  rule = [
    {
      reg: '^#图片$',
      fnc: 'sendImage'
    }
  ];
  
  async sendImage(e) {
    const segment = global.segment;
    const image = segment.image('https://example.com/image.png');
    await e.reply(image);
    return true;
  }
}
```

### 复读机插件

```javascript
export class RepeatPlugin {
  name = '复读机';
  
  rule = [
    {
      reg: '^#复读 (.+)$',
      fnc: 'repeat'
    }
  ];
  
  async repeat(e) {
    const match = e.message.match(/^#复读 (.+)$/);
    if (match) {
      await e.reply(match[1]);
      return true;
    }
    return false;
  }
}
```

## 与原生插件的区别

| 特性 | 云崽插件 | 原生插件 |
|------|---------|---------|
| 格式 | 类导出 | 对象导出 |
| 规则匹配 | rule 数组 | commands 数组 |
| 消息回复 | e.reply() | ctx.sendMessage() |
| 消息构建 | segment | 直接字符串 |
| 优先级 | priority 属性 | priority 属性 |

## 注意事项

1. 云崽插件使用 `global.segment` 访问消息构建器
2. `e.reply()` 会自动判断群聊/私聊
3. 正则匹配使用 JavaScript 正则语法
4. 插件优先级数字越小越先执行
5. 返回 `true` 会阻止后续插件执行

## 迁移指南

从云崽迁移插件：

1. 将插件文件复制到 `backend/src/plugins/` 目录
2. 如果是插件包，保持目录结构
3. 重启服务即可自动加载

大部分云崽插件无需修改即可运行，部分依赖特定 API 的插件可能需要适配。
