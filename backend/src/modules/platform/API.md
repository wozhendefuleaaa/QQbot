# QQ机器人API使用文档

## 概述

本文档描述了QQ机器人开放文档v2版本的API接入实现，包括消息发送、频道管理、用户管理等功能。

## 功能列表

### 消息发送
- 文字子频道消息发送
- 频道私信消息发送
- 支持多种消息类型：文本、Markdown、Ark、Embed、富媒体、键盘

### 用户管理
- 获取用户详情
- 获取用户频道列表

### 频道管理
- 获取频道详情
- 获取子频道列表
- 获取子频道详情
- 创建子频道
- 修改子频道
- 删除子频道

### 消息撤回
- 支持撤回单聊、群聊、文字子频道和频道私信消息

## 安装与配置

1. 确保系统已配置QQ机器人的AppID和AppSecret
2. 确保系统已实现Access Token的获取和管理
3. 确保QQ机器人已获得相应的API调用权限

## API使用示例

### 1. 发送文字子频道消息

```typescript
import { sendTextMessage } from './platform/gateway.js';

// 发送文本消息到文字子频道
await sendTextMessage(
  account,           // BotAccount 对象
  'channel_id',      // 文字子频道ID
  'Hello World!',    // 消息内容
  undefined,         // 回复消息ID（可选）
  'channel'          // 目标类型
);
```

### 2. 发送频道私信消息

```typescript
import { sendTextMessage } from './platform/gateway.js';

// 发送文本消息到频道私信
await sendTextMessage(
  account,           // BotAccount 对象
  'guild_id',        // 频道ID
  'Hello World!',    // 消息内容
  undefined,         // 回复消息ID（可选）
  'dms'              // 目标类型
);
```

### 3. 发送Markdown消息

```typescript
import { sendMarkdownMessage } from './platform/gateway.js';

// 发送Markdown消息
await sendMarkdownMessage(
  account,           // BotAccount 对象
  'target_id',       // 目标ID
  {
    custom_template_id: 'test-template',
    params: [
      {
        key: 'title',
        values: ['Test Title']
      }
    ]
  },
  undefined,         // 回复消息ID（可选）
  'channel'          // 目标类型
);
```

### 4. 获取用户详情

```typescript
import { getUserInfo } from './platform/gateway.js';

// 获取用户详情
const userInfo = await getUserInfo(
  account,           // BotAccount 对象
  'openid'           // 用户openid
);

console.log(userInfo);
// 输出: { openid: '...', nickname: '...', avatar: '...' }
```

### 5. 获取频道列表

```typescript
import { getUserGuilds } from './platform/gateway.js';

// 获取用户频道列表
const guilds = await getUserGuilds(
  account,           // BotAccount 对象
  'openid'           // 用户openid
);

console.log(guilds);
// 输出: [{ id: '...', name: '...', ... }, ...]
```

### 6. 获取子频道列表

```typescript
import { getChannels } from './platform/gateway.js';

// 获取子频道列表
const channels = await getChannels(
  account,           // BotAccount 对象
  'guild_id'         // 频道ID
);

console.log(channels);
// 输出: [{ id: '...', name: '...', type: 0, ... }, ...]
```

### 7. 创建子频道

```typescript
import { createChannel, CHANNEL_TYPE } from './platform/gateway.js';

// 创建文字子频道
const channel = await createChannel(
  account,           // BotAccount 对象
  'guild_id',        // 频道ID
  {
    name: '新子频道',
    type: CHANNEL_TYPE.TEXT,
    parent_id: 'parent_channel_id', // 父频道ID（可选）
    position: 1       // 排序位置（可选）
  }
);

console.log(channel);
// 输出: { id: '...', name: '新子频道', ... }
```

### 8. 撤回消息

```typescript
import { recallMessage } from './platform/gateway.js';

// 撤回消息
const result = await recallMessage(
  account,           // BotAccount 对象
  'target_id',       // 目标ID
  'message_id',      // 消息ID
  'channel'          // 目标类型
);

console.log(result.success);
// 输出: true
```

## 错误处理

所有API调用都可能抛出错误，建议使用try-catch进行错误处理：

```typescript
try {
  await sendTextMessage(account, 'channel_id', 'Hello World!', undefined, 'channel');
  console.log('消息发送成功');
} catch (error) {
  console.error('消息发送失败:', error.message);
  // 处理错误
}
```

## 频率限制

QQ平台对API调用有频率限制，请合理控制调用频率：

- 单聊：主动消息每月4条，被动消息60分钟内最多回复5次
- 群聊：主动消息每月4条，被动消息5分钟内最多回复5次
- 文字子频道：每秒最多发送5条消息
- 频道私信：每天每个用户最多2条主动消息，每天累计最多200条主动消息

## 注意事项

1. 确保BotAccount对象包含正确的AppID和AppSecret
2. 确保Access Token有效且未过期
3. 注意消息发送的频率限制
4. 注意消息内容的格式和长度限制
5. 对于需要权限的操作（如子频道管理），确保机器人具有相应的权限
