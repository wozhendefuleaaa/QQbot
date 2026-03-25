# QQ 机器人管理平台

基于 QQ 官方机器人 API 的现代化管理平台，支持多账号管理、消息收发、插件系统和第三方集成。

## 功能特性

### 核心功能
- 🤖 **多账号管理** - 支持添加、管理多个 QQ 机器人账号
- 💬 **消息收发** - 支持私聊、群聊消息的收发与历史记录
- 🔌 **插件系统** - 支持热加载、命令系统、权限控制
- 🏪 **插件市场** - 在线浏览、一键安装社区插件
- 🔗 **第三方集成** - 提供 RESTful API 供外部系统调用
- 🔐 **JWT 认证** - 安全的用户认证与权限管理
- 📱 **移动端适配** - 响应式设计，完美支持手机端访问

### 稳定性优化
- ✅ 消息回复过期检查（120秒有效期）
- ✅ 发送频率限制（防止 22007 错误）
- ✅ 自动重连机制

### 功能增强
- ✅ 消息撤回功能
- ✅ 图片上传发送
- ✅ 群管理（禁言/踢人）
- ✅ 消息分页加载

## 快速开始

### 环境要求
- Node.js >= 18
- npm >= 9
- 可选：MySQL、Redis（用于持久化）

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd wawa-qqbot

# 安装依赖
npm install

# 复制环境变量
cp .env.example .env
```

### 配置

编辑 `.env` 文件，填入 QQ 机器人配置：

```env
# QQ 官方平台配置
QQ_APP_ID=你的AppID
QQ_CLIENT_SECRET=你的ClientSecret

# 可选配置
QQ_GATEWAY_INTENTS=0
QQ_MESSAGE_API_TEMPLATE=
```

### 环境变量说明

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `ADMIN_PASSWORD` | `admin123` | 管理员初始密码，首次登录后强制修改 |
| `DATA_DIR` | `./data` | 数据存储目录（用户数据、配置等） |
| `JWT_SECRET` | - | JWT 密钥，生产环境必须设置 |
| `JWT_EXPIRES_IN` | `24h` | Token 有效期 |
| `QQ_GATEWAY_INTENTS` | `3` | Gateway 订阅事件位掩码 |

### 首次登录

首次启动时，系统会自动创建管理员账户：

- **用户名**: `admin`
- **密码**: `admin123`（或通过 `ADMIN_PASSWORD` 环境变量自定义）

⚠️ **重要**: 使用默认密码登录后，系统会强制要求修改密码，请设置一个安全的密码。

### 运行

```bash
# 开发模式
npm run dev:backend  # 启动后端 (端口 3000)
npm run dev:webui    # 启动前端 (端口 5173)

# 生产构建
npm run build
npm run start
```

### Docker 部署

```bash
docker compose up -d
```

## WebUI 界面

访问 `http://localhost:5173` 进入管理界面：

### 桌面端
- **账号管理** - 添加、管理机器人账号
- **聊天管理** - 查看会话、发送消息、撤回消息
- **平台连接** - 连接/断开 QQ 平台，查看日志
- **配置中心** - 系统配置、插件权限矩阵管理
  - 支持多账号插件权限配置
  - 批量启用/禁用插件
  - 群组级别的插件控制
  - 实时 Toast 通知反馈
  - 删除操作确认对话框
- **日志中心** - 系统日志、平台日志
- **统计中心** - 消息统计、活跃度分析
- **开放 API** - 管理 API Token
- **插件中心** - 管理插件、浏览插件市场
  - 插件市场：在线浏览社区插件
  - 一键安装：自动下载、解压、加载
  - 插件卡片：展示插件信息、分类、标签
  - 安装进度：实时显示安装状态

### 移动端
- **底部导航栏** - 5个主要功能入口（首页、聊天、平台、插件、更多）
- **双视图聊天** - 会话列表与聊天详情分离，支持滑动返回
- **手势交互** - 边缘滑动返回、触摸优化的点击区域
- **安全区域适配** - 支持 iOS 刘海屏和底部指示条
- **流畅动画** - 视图切换滑入/滑出动画效果

## 插件系统

### 插件结构

```typescript
// backend/src/plugins/my-plugin.ts
import { Plugin, PluginContext, MessageEvent } from '../core/plugin-types.js';

const myPlugin: Plugin = {
  id: 'my-plugin',
  name: '我的插件',
  version: '1.0.0',
  description: '插件描述',
  enabled: true,
  priority: 100,

  // 加载时调用
  onLoad: async (ctx: PluginContext) => {
    ctx.log('info', '插件已加载');
  },

  // 卸载时调用
  onUnload: async () => {
    console.log('插件已卸载');
  },

  // 处理消息
  onMessage: async (event: MessageEvent, ctx: PluginContext) => {
    // 返回 true 拦截消息，false 继续传递
    return false;
  },

  // 定义命令
  commands: [
    {
      name: 'hello',
      aliases: ['你好', 'hi'],
      description: '打招呼',
      permission: 'public',  // public | admin | owner
      cooldown: 5,           // 冷却时间（秒）
      handler: async (args, event, ctx) => {
        return '你好！';
      }
    }
  ]
};

export default myPlugin;
```

### 命令系统

- **权限控制**: `public`（公开）、`admin`（管理员）、`owner`（所有者）
- **冷却时间**: 防止命令刷屏
- **命令别名**: 支持多个触发词
- **内置帮助**: `/help` 或 `/帮助`

### 插件 API

```typescript
interface PluginContext {
  // 发送消息
  sendMessage(targetId: string, targetType: 'user' | 'group', text: string): Promise<void>;
  
  // 记录日志
  log(level: 'info' | 'warn' | 'error', message: string): void;
  
  // 获取当前连接账号
  getConnectedAccountId(): string | null;
}
```

## 外部 API

### 认证

所有外部 API 使用 Bearer Token 认证：

```bash
# 创建 Token
curl -X POST http://localhost:3000/api/openapi/tokens \
  -H "Content-Type: application/json" \
  -d '{"name":"my-token"}'

# 使用 Token
curl http://localhost:3000/api/external/status \
  -H "Authorization: Bearer qqbot_xxx"
```

### API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/external/status` | GET | 获取机器人状态 |
| `/api/external/connect` | POST | 连接机器人 |
| `/api/external/disconnect` | POST | 断开连接 |
| `/api/external/send` | POST | 发送消息 |
| `/api/external/conversations` | GET | 获取会话列表 |
| `/api/external/conversations/:id/messages` | GET | 获取会话消息 |
| `/api/external/accounts` | GET | 获取账号列表 |
| `/api/external/logs` | GET | 获取平台日志 |
| `/api/external/statistics` | GET | 获取统计信息 |

### 发送消息示例

```bash
curl -X POST http://localhost:3000/api/external/send \
  -H "Authorization: Bearer qqbot_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "targetId": "用户ID或群ID",
    "targetType": "user",
    "message": "你好！"
  }'
```

## 项目结构

```
wawa-qqbot/
├── backend/                 # 后端代码
│   ├── src/
│   │   ├── core/           # 核心模块
│   │   │   ├── app.ts      # 应用入口
│   │   │   ├── store.ts    # 状态管理
│   │   │   ├── auth.ts     # 认证系统
│   │   │   ├── plugin-manager.ts    # 插件管理
│   │   │   ├── plugin-types.ts      # 插件类型
│   │   │   ├── python-adapter.ts    # Python 插件适配器
│   │   │   ├── yunzai-adapter.ts    # 云崽插件适配器入口
│   │   │   ├── yunzai/              # 云崽适配器模块
│   │   │   │   ├── types.ts         # 类型定义
│   │   │   │   ├── config.ts        # 配置管理
│   │   │   │   ├── segment.ts       # 消息段构建
│   │   │   │   ├── handler.ts       # 事件处理器
│   │   │   │   ├── plugin.ts        # 插件基类
│   │   │   │   ├── event.ts         # 事件创建
│   │   │   │   ├── bot.ts           # Bot对象
│   │   │   │   └── index.ts         # 主入口
│   │   │   └── middleware/ # 中间件
│   │   ├── modules/        # 功能模块
│   │   │   ├── accounts/   # 账号管理
│   │   │   ├── auth/       # 认证路由
│   │   │   ├── chat/       # 聊天功能
│   │   │   ├── platform/   # 平台连接
│   │   │   ├── plugins/    # 插件路由
│   │   │   ├── external/   # 外部 API
│   │   │   └── ...
│   │   ├── plugins/        # 插件目录
│   │   │   ├── example-plugin.ts       # TypeScript 插件示例
│   │   │   ├── example-plugin.py       # Python 插件示例
│   │   │   ├── example-yunzai-plugin.ts # 云崽插件示例
│   │   │   ├── PYTHON_PLUGIN_GUIDE.md  # Python 插件开发指南
│   │   │   └── YUNZAI_ADAPTER.md       # 云崽插件适配文档
│   │   └── types.ts        # 类型定义
│   └── data/               # 数据存储
├── webui/                  # 前端代码
│   └── src/
│       ├── modules/        # 页面模块
│       ├── services/       # API 服务
│       ├── hooks/          # 自定义 Hooks
│       ├── contexts/       # React Context
│       └── components/     # UI 组件
└── docker-compose.yml      # Docker 编排
```

## 健康检查

```bash
# 健康检查
curl http://localhost:3000/health

# 就绪检查
curl http://localhost:3000/ready
```

## 开发指南

### 编译

```bash
# 编译后端
cd backend && npm run build

# 编译前端
cd webui && npm run build
```

### 添加新插件

1. 在 `backend/src/plugins/` 创建插件文件
2. 编译后端：`npm run build`
3. 插件会自动加载

### 热重载插件

```bash
# 通过 API 重载插件
curl -X POST http://localhost:3000/api/plugins/my-plugin/reload
```

## 插件开发指南

### TypeScript 插件

参考 [`example-plugin.ts`](backend/src/plugins/example-plugin.ts) 获取完整的 TypeScript 插件示例。

### Python 插件

参考 [`PYTHON_PLUGIN_GUIDE.md`](backend/src/plugins/PYTHON_PLUGIN_GUIDE.md) 获取详细的 Python 插件开发指南。

### 云崽插件

参考 [`YUNZAI_ADAPTER.md`](backend/src/plugins/YUNZAI_ADAPTER.md) 了解如何使用云崽插件格式。

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 获取完整的更新历史。

### v1.2.0 (2026-03-25)

#### 新增功能
- 🏪 **插件市场** - 在线插件市场系统
  - 浏览社区插件，支持分类筛选和搜索
  - 一键安装插件，自动下载、解压、加载
  - 实时安装进度显示
  - 插件卡片展示详细信息（作者、版本、标签等）
  - 支持云崽兼容插件标识

#### 后端更改
- 新增 [`backend/src/modules/market/routes.ts`](backend/src/modules/market/routes.ts) - 插件市场路由
  - `GET /api/plugins/market/list` - 获取市场插件列表
  - `GET /api/plugins/market/:id` - 获取插件详情
  - `POST /api/plugins/market/install` - 安装插件
  - `GET /api/plugins/market/install/progress/:id` - 获取安装进度
  - `GET /api/plugins/market/check-updates` - 检查插件更新
  - `POST /api/plugins/market/refresh` - 刷新市场索引

#### 前端更改
- 新增 [`webui/src/modules/plugins/PluginMarketTab.tsx`](webui/src/modules/plugins/PluginMarketTab.tsx) - 市场标签页
- 新增 [`webui/src/modules/plugins/PluginMarketCard.tsx`](webui/src/modules/plugins/PluginMarketCard.tsx) - 插件卡片组件
- 新增 [`webui/src/modules/plugins/PluginInstallDialog.tsx`](webui/src/modules/plugins/PluginInstallDialog.tsx) - 安装进度对话框
- 更新 [`webui/src/modules/plugins/PluginsPanel.tsx`](webui/src/modules/plugins/PluginsPanel.tsx) - 集成市场标签页

#### 测试插件仓库
- [wawa-plugin-ai-chat](https://gitee.com/feixingwa/wawa-plugin-ai-chat) - AI 对话插件
- [wawa-plugin-music-player](https://gitee.com/feixingwa/wawa-plugin-music-player) - 音乐播放插件
- [wawa-plugin-group-manage](https://gitee.com/feixingwa/wawa-plugin-group-manage) - 群管理助手插件
- [wawa-plugin-weather-query](https://gitee.com/feixingwa/wawa-plugin-weather-query) - 天气查询插件
- [wawa-plugin-image-search](https://gitee.com/feixingwa/wawa-plugin-image-search) - 搜图插件

### v1.1.0 (2026-03-14)

#### 新增功能
- 🔐 **JWT 认证系统** - 完整的用户认证机制
  - 登录/登出功能
  - JWT Token 验证
  - 角色权限控制（admin/user）
  - 默认管理员账户：admin / admin123
  - Token 有效期可配置（默认 24 小时）

#### 后端更改
- 新增 [`backend/src/core/auth.ts`](backend/src/core/auth.ts) - 认证核心工具
- 新增 [`backend/src/core/middleware/auth.ts`](backend/src/core/middleware/auth.ts) - 认证中间件
- 新增 [`backend/src/modules/auth/routes.ts`](backend/src/modules/auth/routes.ts) - 认证路由
- 所有 `/api` 路由现在需要认证

#### 前端更改
- 新增 [`webui/src/contexts/AuthContext.tsx`](webui/src/contexts/AuthContext.tsx) - 认证状态管理
- 新增 [`webui/src/modules/auth/LoginPage.tsx`](webui/src/modules/auth/LoginPage.tsx) - 登录页面
- 更新 [`webui/src/services/api.ts`](webui/src/services/api.ts) - 添加认证头
- 未认证时自动跳转登录页

## 许可证

MIT License
