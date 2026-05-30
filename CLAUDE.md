# CLAUDE.md

## 项目概述

QQ 机器人管理平台 — 支持 QQ 官方机器人 (WebSocket Gateway) 与 OneBot v11 反向 WebSocket 的现代化管理平台。基于 npm workspaces monorepo 架构，提供多账号管理、消息收发、插件系统（兼容云崽）、插件市场、第三方 OpenAPI 集成等完整功能。

---

## 技术栈

### 后端 (`backend/`)

| 分类 | 技术 | 版本/备注 |
|------|------|-----------|
| 运行时 | Node.js + TypeScript | >= 18, ESM (`"type": "module"`) |
| Web 框架 | Express 4 | — |
| WebSocket | `ws` 8.x | 同时承载 QQ Gateway 客户端和 OneBot 反向 WS 服务端 |
| 数据库(可选) | MySQL + Redis | `mysql2`, `ioredis`; 默认使用文件系统存储 (`backend/data/`) |
| 认证 | JWT + bcryptjs + SHA-256 | `jsonwebtoken` 9.x, `bcryptjs` 3.x, OpenAPI Token 哈希存储 |
| API 文档 | swagger-jsdoc + swagger-ui-express | OpenAPI 3.0 规范, `/api-docs` 端点 |
| 测试 | vitest | 轻量级单元测试框架 |
| 开发工具 | tsx (watch), tsc (构建) | `tsx` 4.x, `TypeScript` 5.6 |
| 编译目标 | ES2022, NodeNext 模块解析 | `strict: true` |

### 前端 (`webui/`)

| 分类 | 技术 | 版本/备注 |
|------|------|-----------|
| 框架 | React 18 + Vite 5 | `@vitejs/plugin-react` |
| UI 库 | shadcn/ui (Radix UI) | `@radix-ui/react-dialog`, `@radix-ui/react-slot` |
| 样式 | Tailwind CSS 4 | `darkMode: 'class'`, `tailwindcss-animate` |
| 图标 | lucide-react | 0.577.x |
| 状态管理 | @tanstack/react-query | 5.x |
| 虚拟滚动 | @tanstack/react-virtual | 优化长列表消息渲染 |
| 图表 | recharts | 3.x |
| Toast | sonner | 2.x |
| Markdown | react-markdown | 10.x |
| 路径别名 | `@/` → `src/` | tsconfig `paths` + vite `resolve.alias` |
| 代码风格 | ESLint Flat Config + Prettier | typescript-eslint, 根 package.json |

---

## 项目结构

```
wawa-qqbot/                          # npm workspaces monorepo
├── package.json                     # 根配置: workspaces=["backend","webui"]
├── .env.example                     # 环境变量模板
├── docker-compose.yml               # MySQL 8.4 + Redis 7.4 + 统一服务
├── Dockerfile                       # 多阶段构建
├── docker-start.sh                  # 容器启动脚本（进程监控 + 优雅关闭）
│
├── .prettierrc                      # Prettier 格式化配置
├── .prettierignore                  # Prettier 忽略文件
├── eslint.config.mjs                # ESLint Flat Config (typescript-eslint)
│
├── backend/
│   ├── package.json                 # @qqbot/backend, ESM
│   ├── tsconfig.json                # target: ES2022, module: NodeNext
│   ├── vitest.config.ts             # vitest 单元测试配置
│   └── src/
│       ├── index.ts                 # 入口: import('./core/app.js')
│       ├── types.ts                 # 全局类型定义（BotAccount, Message, PluginInfo...）
│       ├── core/
│       │   ├── app.ts               # Express 应用初始化与启动（bootstrap 函数）
│       │   ├── store.ts             # 内存数据存储 + 文件持久化 + 原子写入 + 索引
│       │   ├── auth.ts              # 用户认证系统（JWT + 密码哈希 + 密钥安全检查）
│       │   ├── plugin-manager.ts    # 插件生命周期管理（加载/卸载/消息分发）
│       │   ├── plugin-types.ts      # 插件接口类型定义
│       │   ├── plugin-utils.ts      # 插件工具函数（cron匹配/帮助文本/命令列表）
│       │   ├── python-adapter.ts    # Python 插件子进程适配器
│       │   ├── yunzai-adapter.ts    # 云崽适配器兼容层（重新导出入口）
│       │   ├── swagger.ts           # Swagger/OpenAPI 3.0 文档定义
│       │   ├── middleware/
│       │   │   ├── index.ts         # 中间件统一导出
│       │   │   ├── auth.ts          # JWT 认证中间件 + 角色检查 + 强制改密拦截
│       │   │   ├── error-handler.ts # 错误类体系 + 全局错误处理
│       │   │   ├── rate-limit.ts    # 内存速率限制中间件
│       │   │   └── validator.ts     # 请求体/参数校验中间件
│       │   └── yunzai/
│       │       ├── index.ts         # 云崽主模块（全局对象注入、加载/转换）
│       │       ├── types.ts         # 云崽类型定义
│       │       ├── config.ts        # 云崽配置 + 权限（master/admin）
│       │       ├── segment.ts       # 消息段构建与转换
│       │       ├── handler.ts       # 事件处理器实现
│       │       ├── plugin.ts        # YunzaiPlugin 基类
│       │       ├── event.ts         # 事件创建工厂函数
│       │       └── bot.ts           # YunzaiBot 类（EventEmitter 风格）
│       ├── modules/
│       │   ├── accounts/routes.ts   # 账号 CRUD + 启停
│       │   ├── auth/routes.ts       # 登录/登出/密码修改/用户管理
│       │   ├── chat/routes.ts       # 会话/消息/标签/撤回/图片上传
│       │   ├── config/routes.ts     # 系统配置 + 插件权限矩阵 + 云崽权限
│       │   ├── external/routes.ts   # OpenAPI 对外接口（独立 Bearer 认证 + AppError 错误处理）
│       │   ├── group/routes.ts      # 群管理（成员列表/禁言/踢人）
│       │   ├── logs/routes.ts       # 系统日志查询
│       │   ├── market/routes.ts     # 插件市场（索引/安装/更新/统计/日志）
│       │   ├── onebot/
│       │   │   ├── routes.ts        # OneBot 状态/连接/Token 管理 API
│       │   │   ├── server.ts        # 反向 WS 服务端（initOneBotServer）
│       │   │   ├── adapter.ts       # OneBot 消息适配（inbound message → 统一格式）
│       │   │   ├── auth.ts          # OneBot Bearer Token 创建与验证（SHA-256 哈希存储）
│       │   │   ├── state.ts         # OneBot 连接状态管理
│       │   │   └── types.ts         # OneBot 类型定义
│       │   ├── openapi/routes.ts    # OpenAPI Token 管理 CRUD（SHA-256 哈希存储）
│       │   ├── platform/
│       │   │   ├── routes.ts        # 平台状态/日志/连接/群组列表/联系人
│       │   │   ├── gateway.ts       # Gateway 模块统一导出
│       │   │   ├── gateway-core.ts  # QQ WebSocket Gateway 核心（connect/disconnect ）
│       │   │   ├── gateway-message.ts # QQ 消息发送/撤回/图片上传
│       │   │   ├── gateway-group.ts # QQ 群管理 API
│       │   │   ├── gateway-channel.ts # QQ 频道管理 API
│       │   │   ├── gateway-error.ts # Gateway 错误处理与重试
│       │   │   ├── gateway-types.ts # Gateway 事件类型
│       │   │   ├── gateway-utils.ts # Gateway 工具函数与常量
│       │   │   └── unified-sender.ts # 统一消息发送（自动路由 QQ/OneBot）
│       │   ├── plugins/routes.ts    # 插件管理（CRUD/热重载/源码编辑/上传/健康监控）
│       │   ├── quickreply/routes.ts # 快捷回复管理
│       │   ├── sse/routes.ts        # SSE 实时事件推送（含连接数广播）
│       │   └── statistics/routes.ts # 统计快照（增量计数器优化）
│       ├── __tests__/               # 单元测试目录
│       │   ├── auth.test.ts         # 认证系统测试（9 用例）
│       │   ├── store.test.ts        # 数据存储测试（7 用例）
│       │   └── error-handler.test.ts # 错误中间件测试（9 用例）
│       └── plugins/                 # 内置插件目录（.ts/.js/.py）
│           ├── example-plugin.ts
│           ├── example-plugin.py
│           └── example-yunzai-plugin.ts
│
└── webui/
    ├── package.json                 # @qqbot/webui, ESM
    ├── tsconfig.json                # target: ES2020, module: ESNext, jsx: react-jsx
    ├── vite.config.ts               # 端口 5175, 代理 /api→:3000, 分包策略
    ├── tailwind.config.js           # CSS 变量主题, darkMode: 'class'
    └── src/
        ├── App.tsx                  # 主应用: React Query + Auth + 路由（精简至 ~140 行）
        ├── types.ts                 # 前端类型定义（与后端对应 + UI 专用类型）
        ├── services/api.ts          # 统一 API 请求封装（JWT注入/401处理/超时/离线检测）
        ├── lib/utils.ts             # cn() 类名合并, fmtTime() 时间格式化
        ├── hooks/                   # 自定义 Hooks 目录
        │   ├── useTheme.ts          # 深色/浅色主题切换
        │   ├── useAccounts.ts       # 账号管理（CRUD + 启停）
        │   ├── useChat.ts           # 聊天管理（会话/消息/发送）
        │   ├── usePlatform.ts       # 平台管理（状态/日志/OneBot）
        │   ├── usePlugins.ts        # 插件管理（CRUD + 配置）
        │   ├── useOpenApi.ts        # OpenAPI Token 管理
        │   ├── useConfig.ts         # 系统配置
        │   ├── useStatistics.ts     # 统计快照
        │   ├── useLogs.ts           # 系统日志
        │   └── useNetworkStatus.ts  # 网络在线/离线状态检测
        ├── contexts/AuthContext.tsx  # 认证状态管理（token/用户/强制改密）
        ├── components/
        │   ├── ErrorBoundary.tsx     # React 错误边界（Sonner Toast 通知 + 回退 UI）
        │   ├── layout/
        │   │   └── AppShell.tsx      # 完整应用布局（侧边栏/顶栏/移动导航/离线横幅/变更提示）
        │   └── ui/                  # shadcn/ui 通用组件
        │       ├── sidebar.tsx       # 桌面端侧边栏导航（可折叠）
        │       ├── mobile-nav.tsx    # 移动端底部导航栏（5 个入口）
        │       ├── mobile-header.tsx # 移动端顶部状态栏
        │       ├── theme-toggle.tsx  # 主题切换按钮
        │       ├── badge.tsx         # 状态徽章
        │       └── skeleton.tsx      # 骨架屏组件（9种页面变体）
        └── modules/                 # 页面模块（按功能目录组织）
            ├── auth/                # LoginPage, ChangePasswordDialog
            ├── home/                # HomePage（控制台仪表盘）
            ├── accounts/            # AccountsPanel
            ├── chat/                # ChatPanel, ChatView, ChatWindow (虚拟滚动)
            ├── platform/            # PlatformPanel（QQ + OneBot）
            ├── config/              # ConfigPanel, PluginPermissionTab
            ├── logs/                # LogsPanel
            ├── statistics/          # StatisticsPanel
            ├── openapi/             # OpenApiPanel
            └── plugins/             # PluginsPanel, PluginMarketTab, PluginMarketCard, PluginInstallDialog
```

---

## 常用命令

```bash
# === 安装依赖 ===
npm install                          # 安装所有 workspace 依赖

# === 开发模式 ===
npm run dev:backend                  # 启动后端 (端口 3000), tsx watch 热重载
npm run dev:webui                    # 启动前端 (端口 5175), Vite HMR
npm run dev:all                      # 同时启动前后端 (concurrently)

# === 单 workspace ===
npm run dev -w backend
npm run dev -w webui

# === 测试 ===
npm run test -w backend              # 运行后端单元测试 (vitest run)
npm run test:watch -w backend        # 监听模式运行测试

# === 代码质量 ===
npm run lint                         # ESLint 检查
npm run format                       # Prettier 格式化
npm run format:check                 # Prettier 格式检查

# === 生产构建 ===
npm run build                        # 构建后端 (tsc) + 前端 (vite build)
npm run start                        # 生产启动后端 (node backend/dist/index.js)

# === Docker ===
docker compose up -d                 # 启动 MySQL + Redis + 统一服务
docker compose down                  # 停止所有服务
```

---

## 核心模块详解

### 1. 应用入口 `backend/src/core/app.ts`

**初始化流程 (bootstrap)**:
1. `ensureJwtSecretSafety()` → 生产环境验证 JWT_SECRET 已修改（使用默认值则 panic 退出）
2. `cleanupTmpFiles()` → 清理 `data/` 目录残留的 `.tmp` 文件
3. `loadAccountsFromDisk()` → 从 `data/accounts.json` 加载账号
4. `loadAppConfigFromDisk()` → 加载应用配置（兼容旧 pluginBlacklist → pluginPermissions 迁移）
5. `loadPluginsFromDisk()` → 加载插件注册表，无数据时自动创建 `system-echo` 示例
6. `loadOpenApiTokensFromDisk()` / `loadChatDataFromDisk()` / `loadQuickRepliesFromDisk()` → 加载数据并重建内存索引
7. `initializeDefaultAdmin()` → 首次启动创建 admin 用户
8. `loadAllPlugins()` → 扫描 `src/plugins/` 目录加载所有插件
9. 启动 HTTP Server → `initOneBotServer(server)` → `autoConnectFirstAccount()`

**中间件链**: 速率限制 → CORS → JSON/FileUpload（10MB限制） → 请求日志 → Swagger UI (`/api-docs`) → 路由

**路由注册层级**:

| 层级 | 路径 | 认证方式 | 说明 |
|------|------|----------|------|
| 1 无认证 | `/health`, `/ready`, `/api/auth/*`, `/api/external/*`, `/api/sse/*`, `/api/plugins/market/*`, `/api-docs`, `/api-docs.json` | 无 / 独立认证 | 健康检查、认证、外部 API、SSE、插件市场、Swagger |
| 2 JWT 认证 | `/api/*` | `authMiddleware` (Bearer JWT) | 所有内部管理 API |
| 3 静态文件 | `*` (生产环境) | 无 | SPA 回退到 `webui/dist/index.html` |

**进程信号处理**: SIGINT/SIGTERM → `syncSaveCriticalData()` (同步写入) → `process.exit(0)`
**未捕获异常处理**: `uncaughtException` / `unhandledRejection` → `addSystemLog('error', ...)` → `syncSaveCriticalData()` → `process.exit(1)` (防止数据丢失)

---

### 2. 数据存储 `backend/src/core/store.ts`

**核心数据结构** (全部为模块级可变数组/对象):

```typescript
accounts: BotAccount[]               // 机器人账号列表
conversations: Conversation[]        // 会话列表
messages: Message[]                  // 消息列表（最多 10000 条）
platformLogs: PlatformLog[]          // 平台日志（最多 300 条）
systemLogs: SystemLog[]              // 系统日志（最多 1000 条）
plugins: PluginInfo[]                // 插件注册表
openApiTokens: OpenApiToken[]        // OpenAPI Token 列表
quickReplies: QuickReply[]           // 快捷回复列表
platformStatus: PlatformStatus       // 平台连接状态
appConfig: AppConfig                 // 应用配置
```

**内存索引** (O(1) 查找优化):

| 索引 | 类型 | 说明 |
|------|------|------|
| `conversationById` | `Map<string, Conversation>` | 按 ID 快速查找会话 |
| `messagesByConversationId` | `Map<string, Message[]>` | 按会话 ID 分组消息（增量维护） |

**增量统计计数器**:

| 计数器 | 说明 |
|------|------|
| `statsInboundCount` | 入站消息总数（每次 `ensureConversationForInbound` 递增） |
| `statsOutboundCount` | 出站消息总数（每次 `recordOutboundMessage` 递增） |

**关键函数**:

| 函数 | 签名 | 说明 |
|------|------|------|
| `id(prefix)` | `(prefix: string) => string` | 生成随机 ID: `{prefix}_{8位随机}` |
| `nowIso()` | `() => string` | 当前 ISO 时间戳 |
| `maskSecret(input)` | `(input: string) => string` | 脱敏: 保留首2 + 尾2字符 |
| `hashToken(input)` | `(input: string) => string` | SHA-256 哈希（OpenAPI Token 存储比对） |
| `readJsonFile<T>(path)` | `(path: string) => Promise<T \| null>` | 读 JSON 文件，ENOENT 返回 null |
| `writeJsonFile<T>(path, data)` | `(path: string, data: T) => Promise<void>` | **原子写入**: 先写 `.tmp`，再 `rename` 到目标（防止中途崩溃文件损坏） |
| `writeJsonFileSync<T>(path, data)` | `(path: string, data: T) => void` | 同步原子写入（用于进程崩溃时的数据保护） |
| `syncSaveCriticalData()` | `() => void` | 同步保存所有关键数据（SIGTERM/uncaughtException 时调用） |
| `cleanupTmpFiles()` | `() => void` | 启动时清理残存的 `.tmp` 文件 |
| `rebuildIndexes()` | `() => void` | 从数组重建内存索引（数据加载后调用） |
| `findConversationById(id)` | `(id: string) => Conversation \| undefined` | O(1) 按 ID 查找会话 |
| `findMessagesByConversationId(id)` | `(id: string) => Message[]` | O(1) 按会话 ID 获取消息 |
| `recordOutboundMessage(msg)` | `(msg: Message) => void` | 记录出站消息（更新计数器 + 添加到索引 + 持久化） |
| `load*/save*` 系列 | 如 `loadAccountsFromDisk()` / `saveAccountsToDisk()` | 各数据结构的持久化加载/保存（加载后自动调用 `rebuildIndexes()`） |
| `fetchAppAccessToken(account, forceRefresh?)` | `(account: BotAccount, forceRefresh?: boolean) => Promise<string>` | 获取/缓存 QQ AccessToken（7200秒过期，60秒提前刷新） |
| `ensureConversationForInbound(peerId, content, peerType, options?)` | `(peerId, content, peerType, options?) => ConversationRecord \| null` | 入站消息自动创建/更新会话，递增 `statsInboundCount` |
| `ensureConversationForInboundByAccount(accountId, peerId, content, peerType, options?)` | 同上 + accountId 参数 | 指定账号版本的会话管理 |
| `buildStatisticsSnapshot()` | `() => StatisticsSnapshot` | 构建统计快照（使用增量计数器 + 索引，避免 O(n) 遍历） |
| `scheduleSaveChatDataToDisk()` | `() => void` | 延迟 200ms 防抖保存聊天数据 |
| `addPlatformLog(level, message)` | `(level: LogLevel, message: string) => void` | 添加平台日志（同步写 systemLog + console） |
| `addSystemLog(level, category, message)` | `(level, category, message) => void` | 添加系统日志，category ∈ {framework, plugin, openapi, config, market} |

---

### 3. 认证系统 `backend/src/core/auth.ts`

**用户存储**: 内存 `users: UserWithPassword[]` + 文件 `data/users.json`

**密码策略**:
- bcrypt 哈希，salt rounds = 10
- 默认管理员 `admin` / `admin123`（可通过 `ADMIN_PASSWORD` 环境变量覆盖）
- 首次使用默认密码登录后 `requirePasswordChange = true`，强制修改

**JWT 配置**:
- 默认密钥: `qqbot-jwt-secret-key-change-in-production` (生产环境警告)
- 默认过期: `24h`，支持 `JWT_EXPIRES_IN` 配置 (s/m/h/d 后缀)
- Token 过期时间计算: `getTokenExpiresIn()` 解析后缀返回秒数

**导出函数**:

| 函数 | 说明 |
|------|------|
| `hashPassword(password)` | bcrypt 哈希密码 |
| `verifyPassword(password, hash)` | 验证密码 |
| `generateToken(user)` | 生成 JWT Token |
| `verifyToken(token)` | 验证 JWT Token，返回 `JwtPayload` 或 `null` |
| `ensureJwtSecretSafety()` | **生产环境安全检查**: 若 `NODE_ENV=production` 且使用默认 JWT_SECRET，则打印错误日志并 `process.exit(1)` |
| `findUserByUsername(username)` | 按用户名查找用户（含 passwordHash） |
| `findUserById(id)` | 按 ID 查找用户 |
| `createUser(username, password, role?)` | 创建用户（自动持久化） |
| `changePassword(userId, newPassword)` | 修改密码 |
| `updateUserLastLogin(userId)` | 更新最后登录时间 |
| `toPublicUser(user)` | 转换用户对象（去除 passwordHash） |
| `initializeDefaultAdmin()` | 初始化默认管理员账户 |
| `isUsingDefaultPassword(password)` | 检查是否使用默认密码 |
| `clearRequirePasswordChange(userId)` | 清除强制改密标记 |

---

### 4. 插件系统 `backend/src/core/plugin-manager.ts`

**插件目录**: 优先 `src/plugins/`，回退 `dist/plugins/`

**核心导出函数**:

| 函数 | 签名 | 说明 |
|------|------|------|
| `loadAllPlugins()` | `() => Promise<void>` | 扫描并加载所有插件（去重、持久化注册表） |
| `loadPluginFromFile(filePath)` | `(filePath: string) => Promise<Plugin \| Plugin[] \| null>` | 从文件加载单个插件，支持 TS/JS/Python/云崽格式 |
| `unloadPlugin(pluginId)` | `(pluginId: string) => Promise<boolean>` | 卸载插件（调用 onUnload + 清理定时器 + 清理 Python 进程） |
| `reloadPlugin(pluginId)` | `(pluginId: string) => Promise<Plugin \| null>` | 热重载插件（带时间戳绕过 ESM 缓存） |
| `dispatchMessage(message, peerId?, peerType?, inboundMsgId?)` | `(message: Message, ...) => Promise<boolean>` | 消息分发：按优先级排序 → 命令匹配 → 事件处理器 → onMessage，返回 true 表示已拦截 |
| `getLoadedPlugins()` | `() => Plugin[]` | 获取已加载插件列表 |
| `getPluginConfig()` | `() => PluginConfig` | 获取插件配置 |
| `updatePluginConfig(config)` | `(config: Partial<PluginConfig>) => void` | 更新插件配置 |
| `getAvailableCommands()` | `() => Array<{plugin, command}>` | 获取所有可用命令 |
| `getPluginsDir()` | `() => string` | 获取插件目录路径 |

**插件加载流程**:
1. 遍历 `PLUGINS_DIR` 目录
2. 目录类型 → `loadPluginPackage()` (云崽插件包: 自动 `npm install` 依赖, 加载入口 + apps 子插件)
3. `.ts/.js/.mjs` 文件 → `loadPluginFromFile()` (标准插件/云崽文件)
4. `.py` 文件 → `loadPythonPluginFile()` (Python 插件适配器)
5. 加载失败时自动检测 `MODULE_NOT_FOUND` → 自动 `npm install` 后重试

**插件类型 `Plugin` 接口** (来自 `plugin-types.ts`):

```typescript
type Plugin = {
  id: string; name: string; version: string; description: string;
  author?: string; enabled: boolean; priority?: number; // 数字越小越优先
  onLoad?: (ctx: PluginContext) => Promise<void> | void;
  onUnload?: () => Promise<void> | void;
  onMessage?: (event: MessageEvent, ctx: PluginContext) => Promise<boolean | void>;
  commands?: CommandDefinition[];
  cronJobs?: { pattern: string; handler: (ctx: PluginContext) => Promise<void> | void }[];
  eventHandlers?: { event: string; handler: (event, ctx) => Promise<boolean | void> }[];
  dispose?: () => Promise<void> | void;
};
```

**插件上下文 `PluginContext`**:
```typescript
type PluginContext = {
  sendMessage: (targetId: string, targetType: 'user' | 'group', text: string) => Promise<void>;
  log: (level: 'info' | 'warn' | 'error', message: string) => void;
  getConnectedAccountId: () => string | null;
};
```

**权限矩阵**:
- 数据结构: `appConfig.pluginPermissions[accountId] = { groups: string[], disabledPlugins: Record<groupId, pluginId[]> }`
- `'private'` 作为特殊 groupId 表示私聊维度
- `isPluginDisabled(pluginId, accountId, groupId)` 检查是否被禁用

---

### 5. 插件工具函数 `backend/src/core/plugin-utils.ts`

**职责**: 从 `plugin-manager.ts` 拆分出的纯工具函数，提供 cron 表达式匹配、帮助文本构建、命令列表导出等功能。

**导出函数**:

| 函数 | 说明 |
|------|------|
| `matchesCronPattern(now, pattern)` | 匹配 standard cron (5段) 和 quartz cron (6-7段，含秒/年) 模式 |
| `buildHelpText(plugin, includeCommands?, includeCronJobs?, eventNames?)` | 根据插件定义构建 Markdown 帮助文本 |
| `getAvailableCommands(plugin?, format?)` | 获取所有或指定插件的可用命令列表 |
| `getCommandsHelp(plugin?)` | 获取所有或指定插件的命令帮助文本 |

---

### 6. Swagger API 文档 `backend/src/core/swagger.ts`

**OpenAPI 3.0 规范定义**:
- 通过 `swagger-jsdoc` 从 JSDoc 注释自动生成
- 通过 `swagger-ui-express` 在 `/api-docs` 托管交互式 Swagger UI
- JSON 规范在 `/api-docs.json` 公开
- **公开访问** (无认证)，但不在生产环境暴露

**注册**: 在 `app.ts` 的中间件链中，请求日志之后、路由之前挂载

---

### 7. 云崽兼容层 `backend/src/core/yunzai/`

**设计目标**: 让云崽插件（Yunzai-Bot 生态）无需修改即可在本平台运行。

**关键函数** (来自 `yunzai/index.ts`):

| 函数 | 说明 |
|------|------|
| `initYunzaiGlobals(bot?)` | 注入全局对象: `Bot`, `segment`, `Handler`, `cfg`, `plugin`, `redis`(内存模拟), `logger`, `isMaster`, `isAdmin` |
| `isYunzaiPlugin(module)` | 判断是否为云崽插件: 检查 `YunzaiPlugin` 实例 / `rule` 数组 / 原型链 |
| `loadYunzaiPlugin(path, bot, event)` | 动态 import + 实例化云崽插件类 |
| `convertYunzaiPlugin(plugin, bot)` | 转换云崽插件 → 内部格式 (rule→commands, handler→eventHandlers, task→cronJobs) |
| `matchRule(message, rule)` | 正则规则匹配 |
| `executePluginCommand(plugin, handler, event)` | 执行插件命令 |
| `createYunzaiAdapter(botId, api)` | 创建完整云崽适配器 (Bot + 事件工厂 + 初始化) |

**全局 Redis 模拟**: 注入 `globalThis.redis` 提供完整的内存 Redis API (`get/set/del/exists/expire/ttl/keys/incr/decr/hset/hget/hgetall/hdel/lpush/rpush/lrange/llen`)

**全局 logger 模拟**: 注入 `globalThis.logger` 提供 `info/warn/error/debug/trace/mark` 及颜色标记方法

---

### 6. QQ WebSocket Gateway `backend/src/modules/platform/gateway-core.ts`

**连接流程**:
1. `connectGateway(accountId, forceRefreshToken?)` → 获取 AccessToken → 获取 Gateway URL → 建立 WebSocket
2. 收到 `OP_HELLO(10)` → 启动心跳定时器 → 发送 `OP_IDENTIFY(2)`
3. 心跳间隔由服务端 `helloData.heartbeat_interval` 决定
4. 心跳超时检测: 超过 `heartbeatInterval*2+15s` 无 ACK → 主动重连

**重连策略**:
- 指数退避: `delay = min(30000, 5000 * attempts)`
- `OP_RECONNECT(7)` / `OP_INVALID_SESSION(9)` / `socket error` / `close` 事件触发
- `OP_INVALID_SESSION` 时 `forceRefreshToken = true`

**消息处理**:
- `payload.t` 存在 → `parseInboundEvent()` 解析 → `ensureConversationForInbound()` → `dispatchMessage()` 分发给插件 → `broadcastNewMessage()` 推送前端
- 使用 `peerOpenId` (QQ API 标准) 作为 targetId，回退到 `peerId`
- `inboundMsgId` 传递给插件系统用于被动回复 (reply)

**断连处理**: `disconnectGateway(autoReconnect)` — 清理定时器 + 关闭 socket + 可选重连

---

### 9. 统一消息发送 `backend/src/modules/platform/unified-sender.ts`

**设计模式**: 按 `account.platformType` 自动路由到 QQ 官方或 OneBot v11 实现

**导出函数**:

| 函数 | 签名 | 说明 |
|------|------|------|
| `ensureAccountTransportReady(account)` | `(account: BotAccount) => Promise<void>` | 验证账号传输层就绪: OneBot 探测 `get_login_info`, QQ 检查 `ONLINE` 状态 |
| `sendTextMessage(account, targetId, text, replyMessageId?, targetType?)` | → `UnifiedSendResult` | 统一发送文本: OneBot 用 `send_group_msg/send_private_msg`, QQ 用 `trySendToQQ` |
| `recallPlatformMessage(account, targetId, messageId, targetType?)` | → `UnifiedRecallResult` | 统一撤回消息 |
| `uploadPlatformImage(account, targetId, fileBuffer, fileName, targetType?)` | → `UnifiedImageUploadResult` | 统一上传图片: OneBot 转 base64, QQ 用 `uploadImage` |
| `sendPlatformImageMessage(account, targetId, fileInfo, targetType?)` | → `UnifiedImageSendResult` | 统一发送图片消息 |

---

### 10. OneBot v11 反向 WebSocket `backend/src/modules/onebot/`

**服务端** (`server.ts`):
- 端点: `ws://<host>:3000/onebot/v11/ws`
- `initOneBotServer(httpServer)` → 创建 `WebSocketServer` 并复用 HTTP Server
- 连接时验证 `Authorization: Bearer <token>` → 绑定账号 → 注册到状态管理
- 消息处理: `echo` 字段存在 → 匹配 `pendingActions` (RPC 响应); `post_type === 'message'` → `handleOneBotIncomingMessage()`
- 断连时清理 pending actions, 移除连接

**RPC 调用** (`callOneBotAction`):
```typescript
callOneBotAction(accountId, action, params?, timeoutMs?) → Promise<OneBotActionResponse>
```
- 生成随机 `echo` 标识 → 发送 JSON 帧 → 等待匹配响应
- 超时返回 `{ status:'failed', retcode:1408, msg:'超时' }`

**状态管理** (`state.ts`):
- `addOneBotConnection(connection)` / `removeOneBotConnection(id)`
- `getOneBotConnection(accountId)` 按 accountId 查找
- `listOneBotConnections()` 列表
- `buildOneBotStatusOverview()` 统计概览

**Token 管理** (`auth.ts`):
- `createOneBotToken(accountId, name)` → 生成 32 字节 hex token → 持久化
- `verifyOneBotBearerToken(authHeader)` → 验证 token → 返回 `{ ok, accountId }`

---

### 9. 插件市场 `backend/src/modules/market/routes.ts`

**API 端点** (公开，不需要 JWT 认证):

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/plugins/market/list` | GET | 获取插件列表（自动标记 installed 状态） |
| `/api/plugins/market/stats` | GET | 市场统计（总数/分类/最近安装/热门） |
| `/api/plugins/market/logs` | GET | 安装日志列表 |
| `/api/plugins/market/logs` | DELETE | 清空安装日志 |
| `/api/plugins/market/:id` | GET | 插件详情 |
| `/api/plugins/market/install` | POST | 安装插件（异步，需要 `{ pluginId, downloadUrl }`） |
| `/api/plugins/market/install/progress/:id` | GET | 安装进度查询（downloading→extracting→installing→loading→completed/failed） |
| `/api/plugins/market/check-updates` | GET | 检查已安装插件更新 |
| `/api/plugins/market/refresh` | POST | 刷新市场缓存 |

**安装流程**:
1. 下载 ZIP (Gitee 用 `curl -L`，其他用 Node.js HTTP)
2. 解压 (unzip → Python zipfile 回退)
3. 自动安装 npm 依赖 (3 次重试 → 逐个安装)
4. 移动到 `plugins/` 目录
5. `loadPluginFromFile()` 加载
6. 写入安装日志 (`data/install-logs.json`，最多保留 100 条)

**市场源**: Gitee `feixingwa/qqbot-plugin-market` → 本地示例索引作为后备

---

### 12. 中间件体系 `backend/src/core/middleware/`

**错误处理** (`error-handler.ts`):
- `AppError` 基类 (statusCode, isOperational, code)
- 子类: `ValidationError(400)`, `UnauthorizedError(401)`, `ForbiddenError(403)`, `NotFoundError(404)`, `ConflictError(409)`
- `asyncHandler(fn)` — 包装异步路由，自动 catch → next(error)
- `errorHandler(err, req, res, next)` — 全局错误处理: AppError → 结构化响应; SyntaxError(body) → 400; 未知 → 500 (生产环境隐藏详情)
- `notFoundHandler(req, res)` — 404 处理

**认证中间件** (`auth.ts`):
- `authMiddleware` — 验证 `Bearer <token>` → `req.user` + `req.jwtPayload`
- `optionalAuthMiddleware` — token 存在则验证，否则放行
- `requireRole(...roles)` — 角色检查工厂
- `requireAdmin` — `requireRole('admin')` 快捷方式
- **强制改密拦截**: `authMiddleware` 内置检查 `req.user.requirePasswordChange === true`，对非白名单路径（`/api/auth/me`, `/api/auth/change-password`, `/api/auth/logout`）返回 `403 Forbidden`，防止未改密用户访问其他 API
- `isPasswordChangeAllowedPath(originalUrl)` — 判断当前路径是否在强制改密白名单内（使用 `req.originalUrl.split('?')[0]` 匹配）

**速率限制** (`rate-limit.ts`):
- `createRateLimiter(options)` — 内存滑动窗口，默认 60s/100 次
- `createApiRateLimiter()` — 60s/120 次，跳过健康检查
- `createStrictRateLimiter()` — 15min/5 次 (登录等敏感接口)
- `createSseRateLimiter()` — 60s/10 次 (防止频繁 SSE 重连)

**请求校验** (`validator.ts`):
- `validateBody(schema)` — 请求体校验
- `validateQuery(schema)` — 查询参数校验
- `validateParams(schema)` — 路径参数校验
- 支持规则: `type`, `required`, `minLength`, `maxLength`, `min`, `maxLength`

---

### 13. 前端核心架构 `webui/src/`

**API 服务层** (`services/api.ts`):
```typescript
api<T>(path: string, init?: RequestInit): Promise<T>
```
- 自动注入 `Authorization: Bearer <token>` (从 `localStorage('auth_token')` 读取)
- 401 时自动清除 token 并跳转首页
- **请求超时**: 15 秒 `AbortController` 超时，超时显示友好提示
- **离线检测**: 网络断开时自动检测 `navigator.onLine` 并即时提示
- 错误信息合并 `error + hint`

**认证上下文** (`contexts/AuthContext.tsx`):
- `login(username, password)` → POST `/api/auth/login` → 保存 token 到 localStorage
- `logout()` → POST `/api/auth/logout` → 清除 token → 刷新
- `refreshUser()` → GET `/api/auth/me` (带 authMiddleware)
- `user` 状态: `User | null`, 含 `requirePasswordChange` 标记
- 强制改密检测: `user.requirePasswordChange === true` → 弹出 ChangePasswordDialog（后端 + 前端双重校验）

**自定义 Hooks** (`hooks/`):

| Hook | 职责 | 导出函数/状态 |
|------|------|------|
| `useTheme()` | 深色/浅色主题切换 | `theme`, `toggleTheme`, `isDark` |
| `useAccounts()` | 账号管理 | `accounts`, `createAccount`, `startAccount`, `stopAccount`, `deleteAccount` (useQuery + useMutation) |
| `useChat()` | 聊天管理 | `conversations`, `messages`, `sendMessage`, `recallMessage`, `uploadImage` |
| `usePlatform()` | 平台管理 | `platformStatus`, `platformLogs`, `connect`, `disconnect`, OneBot 状态 |
| `usePlugins()` | 插件管理 | `plugins`, `loadedPlugins`, `togglePlugin`, `reloadPlugin`, `pluginConfig` |
| `useOpenApi()` | OpenAPI Token 管理 | `tokens`, `createToken`, `toggleToken`, `deleteToken` |
| `useConfig()` | 系统配置 | `appConfig`, `pluginPermissions`, `updateConfig` |
| `useStatistics()` | 统计快照 | `statistics` (使用 refetchInterval 定时刷新) |
| `useLogs()` | 系统日志 | `logs`, `refreshLogs` |
| `useNetworkStatus()` | 网络状态检测 | `isOnline`, `wasOffline` (监听 online/offline 事件 + API 错误辅助检测) |

**布局组件 AppShell** (`components/layout/AppShell.tsx`):
- **职责**: 统管全应用布局结构，从 `App.tsx` 拆出（原 977 行精简至 ~140 行）
- **包含**: 桌面端侧边栏 + 移动端底部导航/顶部状态栏 + 离线横幅 + 数据变更提示条
- **离线横幅**: 使用 `useNetworkStatus` 检测，显示黄色 "网络连接断开" 警告条
- **变更提示**: `isMutating` 时显示 "正在提交更改..." 顶部加载条

**错误边界** (`components/ErrorBoundary.tsx`):
- React `ErrorBoundary` 类组件，包裹所有路由内容
- 错误时显示 `AlertTriangle` 图标 + "页面出现错误" 回退 UI + "刷新页面" 按钮
- 使用 `sonner` Toast 弹出错误摘要通知
- `componentDidCatch` 记录错误到 console

**骨架屏** (`components/ui/skeleton.tsx`):
- 9 种页面变体: `HomePageSkeleton`, `AccountsPageSkeleton`, `ChatPageSkeleton`, `PlatformPageSkeleton`, `ConfigPageSkeleton`, `LogsPageSkeleton`, `StatisticsPageSkeleton`, `PluginsPageSkeleton`, `GenericPageSkeleton`
- 使用 Tailwind `animate-pulse` + 圆角矩形模拟加载状态
- 在 `Suspense` fallback 中配合 `React.lazy` 使用

**主应用** (`App.tsx`):
- React Query (`@tanstack/react-query`) 已拆分到各 hooks 中
- 布局: `ErrorBoundary` → `AppShell` → `Suspense` → 页面内容
- `React.lazy` 延迟加载 9 个页面模块，统一使用 `GenericPageSkeleton` 作为 fallback
- 路由映射: `MenuKey` → 对应 Panel 组件

**虚拟滚动** (`modules/chat/MessagePanel.tsx`):
- 使用 `@tanstack/react-virtual` 的 `useVirtualizer` 渲染消息列表
- `estimateSize: 80` (预估消息行高), `overscan: 5` (可视区域外预渲染)
- 新消息到达时 `scrollToIndex` 自动滚动到底部

**关键工具函数**:
- `cn()` (来自 `lib/utils.ts`) — `clsx` + `tailwind-merge` 类名合并
- `fmtTime(input?)` — ISO 时间 → 中文 locale 字符串

**Vite 配置**:
- 开发端口: 5175, `host: '0.0.0.0'`
- 代理: `/api` → `http://localhost:3000`; `/api/sse` → 特殊 SSE 代理配置 (禁用缓冲)
- 路径别名: `@/` → `src/`
- 构建分包: vendor(react), charts(recharts), markdown(react-markdown), ui(radix+lucide)

---

## 完整 API 路由表

### 认证路由 (`/api/auth`)

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/auth/login` | 无 | 登录 → JWT token |
| POST | `/api/auth/logout` | 无 | 登出 |
| GET | `/api/auth/me` | JWT | 当前用户信息 |
| GET | `/api/auth/status` | 无 | 认证状态检查 |
| POST | `/api/auth/change-password` | JWT | 修改密码 (强制改密时不需旧密码) |
| POST | `/api/auth/users` | JWT+admin | 创建用户 |
| GET | `/api/auth/users` | JWT+admin | 用户列表 |

### 账号管理 (`/api/accounts`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/accounts` | 账号列表 (脱敏) |
| POST | `/api/accounts` | 创建 QQ 官方账号 |
| POST | `/api/accounts/:id/start` | 启动账号 → 自动 connectGateway |
| POST | `/api/accounts/:id/stop` | 停止账号 → disconnectGateway |
| DELETE | `/api/accounts/:id` | 删除账号 |

### 聊天管理 (`/api/conversations`, `/api/messages`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/conversations?accountId=` | 会话列表 |
| GET | `/api/conversations/:id/messages?before=&limit=` | 分页消息 |
| POST | `/api/messages/send` | 发送消息 `{ accountId, targetId, text, targetType }` |
| DELETE | `/api/messages/:id` | 撤回消息 |
| POST | `/api/messages/upload-image` | 上传并发送图片 |
| PUT | `/api/conversations/:id/tags` | 批量设置标签 |
| POST | `/api/conversations/:id/tags` | 添加标签 |
| DELETE | `/api/conversations/:id/tags/:tag` | 删除标签 |

### 平台管理 (`/api/platform`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/platform/status` | 平台连接状态 |
| GET | `/api/platform/logs?limit=` | 平台日志 |
| POST | `/api/platform/connect` | 连接 Gateway `{ accountId, forceRefreshToken }` |
| POST | `/api/platform/disconnect` | 断开 Gateway `{ autoReconnect }` |
| GET | `/api/platform/groups/:accountId` | 获取机器人群组列表 |
| GET | `/api/platform/contacts` | 所有账号的联系人（群组+私聊） |

### 配置中心 (`/api/config`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/config` | 获取完整配置 |
| POST | `/api/config` | 更新配置（含速率限制 10/min） |
| GET | `/api/config/plugin-permissions/:accountId` | 某账号的插件权限矩阵 |
| POST | `/api/config/plugin-permissions/:accountId` | 保存权限矩阵 |
| PATCH | `/api/config/plugin-permissions/:accountId/toggle` | 切换单个插件群组禁用状态 |
| POST | `/api/config/plugin-permissions/:accountId/groups` | 添加群组 |
| DELETE | `/api/config/plugin-permissions/:accountId/groups/:groupId` | 移除群组 |
| GET/POST | `/api/config/yunzai-permission` | 云崽权限配置 |
| POST/DELETE | `/api/config/yunzai-permission/master` | 管理云崽主人 |
| POST/DELETE | `/api/config/yunzai-permission/admin` | 管理云崽管理员 |

### 插件管理 (`/api/plugins`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/plugins` | 插件列表（合并已加载+注册表） |
| GET | `/api/plugins/loaded` | 已加载插件实例 |
| GET | `/api/plugins/commands` | 所有可用命令 |
| GET | `/api/plugins/config` | 插件配置 |
| PUT | `/api/plugins/config` | 更新插件配置 |
| POST | `/api/plugins` | 创建插件 |
| POST | `/api/plugins/:id/toggle` | 启用/禁用插件 |
| POST | `/api/plugins/:id/reload` | 热重载插件 |
| DELETE | `/api/plugins/:id` | 删除插件 |
| GET | `/api/plugins/:id/source` | 获取插件源码 |
| PUT | `/api/plugins/:id/source` | 保存插件源码 |
| POST | `/api/plugins/upload` | 上传插件文件 `{ filename, content }` |
| GET | `/api/plugins/health` | 插件健康监控 |
| DELETE | `/api/plugins/:id/health` | 重置插件健康统计 |

### 群管理 (`/api/groups`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/groups/:groupId/members?accountId=` | 群成员列表 |
| POST | `/api/groups/:groupId/members/:userId/mute` | 禁言 `{ accountId, duration }` (最长30天) |
| DELETE | `/api/groups/:groupId/members/:userId/mute` | 解除禁言 |
| DELETE | `/api/groups/:groupId/members/:userId?accountId=` | 踢出成员 |

### OneBot 管理 (`/api/onebot`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/onebot/status` | 连接概览 |
| GET | `/api/onebot/connections` | 活跃连接列表 |
| POST | `/api/onebot/accounts` | 创建 OneBot 账号 `{ name, selfId }` |
| POST | `/api/onebot/tokens` | 创建 Token `{ accountId, name }` (仅创建时返回明文) |

### OpenAPI Token 管理 (`/api/openapi`)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/openapi/tokens` | Token 列表 (脱敏) |
| POST | `/api/openapi/tokens` | 创建 Token `{ name }` → 返回完整 token (格式 `qqbot_xxx`) |
| POST | `/api/openapi/tokens/:id/toggle` | 启用/禁用 Token |
| DELETE | `/api/openapi/tokens/:id` | 删除 Token |

### 外部 API (`/api/external`) — 独立 `qqbot_xxx` Bearer Token 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/external/status` | 机器人状态 |
| POST | `/api/external/connect` | 连接机器人 `{ accountId }` |
| POST | `/api/external/disconnect` | 断开连接 |
| POST | `/api/external/send` | 发送消息 `{ targetId, targetType, message, msgId? }` |
| GET | `/api/external/conversations?limit=&offset=` | 会话列表 |
| GET | `/api/external/conversations/:id/messages?limit=&before=` | 会话消息 |
| GET | `/api/external/accounts` | 账号列表 |
| GET | `/api/external/logs?limit=` | 平台日志 |
| GET | `/api/external/statistics` | 统计快照 |

### SSE 实时推送 (`/api/sse`)

| 路径 | 说明 |
|------|------|
| `GET /api/sse/events` | SSE 连接 (30s 心跳, 自动清理) |
| `GET /api/sse/clients` | 当前连接数 |

**广播事件类型**: `message`(新消息), `platform_status`(平台状态变化), `platform_log`(平台日志), `connection_count`(SSE 客户端连接数变化)

### 其他路由

| 路径 | 说明 |
|------|------|
| `GET /api/logs?category=` | 系统日志查询 |
| `GET /api/statistics/snapshot` | 统计快照（增量计数器优化） |
| `GET/POST /api/quickreplies` | 快捷回复管理 |
| `GET /health` | 健康检查 |
| `GET /ready` | 就绪检查 (MySQL+Redis 连通性) |
| `GET /api-docs` | Swagger UI 交互式 API 文档 |
| `GET /api-docs.json` | Swagger OpenAPI 3.0 JSON 规范 |

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `BACKEND_PORT` | `3000` | 后端 HTTP/WS 端口 |
| `ADMIN_PASSWORD` | `admin123` | 管理员初始密码 |
| `DATA_DIR` | `./data` (docker: `/app/data`) | 数据持久化目录 |
| `JWT_SECRET` | `qqbot-jwt-secret-key-change-in-production` | JWT 密钥（**生产环境必须修改，否则启动 panic**） |
| `JWT_EXPIRES_IN` | `24h` | Token 有效期 (s/m/h/d) |
| `QQ_APP_ID` | — | QQ 官方 AppID |
| `QQ_CLIENT_SECRET` | — | QQ 官方 ClientSecret |
| `QQ_API_BASE` | `https://bots.qq.com` | QQ API 基址 |
| `QQ_GATEWAY_API_BASE` | `https://api.sgroup.qq.com` | Gateway 查询基址 |
| `QQ_GATEWAY_URL` | — | 手动指定 Gateway 地址（跳过自动获取） |
| `QQ_GATEWAY_INTENTS` | `3` | Gateway 事件订阅位掩码 (1=私聊, 2=群消息) |
| `QQ_AUTH_PREFIX` | `QQBot` | Authorization 头前缀 |
| `QQ_MESSAGE_API_TEMPLATE` | — | 消息 API 模板 `{targetId}` 占位 |
| `MYSQL_URL` | — | MySQL 连接串（可选持久化） |
| `MYSQL_ROOT_PASSWORD` | `root` | MySQL root 密码（docker-compose） |
| `MYSQL_DATABASE` | `qqbot` | MySQL 数据库名 |
| `MYSQL_USER` | `qqbot` | MySQL 用户名 |
| `MYSQL_PASSWORD` | `qqbot123` | MySQL 用户密码 |
| `REDIS_URL` | — | Redis 连接串（可选持久化） |
| `CORS_ORIGINS` | — | 生产 CORS 白名单（逗号分隔） |
| `WEBUI_DIST` | `webui/dist` | 前端静态文件路径 |
| `NODE_ENV` | — | `production` 时托管静态文件 + 隐藏错误详情 + JWT 密钥安全检查 |

---

## 开发注意事项

1. **ESM 模块**: 所有文件使用 `import/export`，禁用 `require`。动态 import 时添加 `?t=${Date.now()}` 绕过 ESM 缓存实现热重载。

2. **文件持久化**: 核心数据以 JSON 文件存储在 `DATA_DIR`（默认 `backend/data/`）。MySQL/Redis 为可选层，仅用于高可用场景。

3. **插件加载顺序**: `src/plugins/` 优先于 `dist/plugins/`。先加载目录型云崽包（入口→apps子插件），再加载单文件。云崽插件支持自动 `npm install` 依赖。

4. **消息分发链**: `dispatchMessage()` 按插件 `priority`（数字越小越优先）排序。命令/事件处理器返回 `true` 时停止继续传递。

5. **云崽兼容前置**: 在加载任何云崽插件前，`initYunzaiGlobals(bot)` 必须先调用一次（注入 `globalThis.Bot/segment/redis/plugin/logger` 等）。

6. **消息回复有效期**: QQ 官方消息回复要求 120 秒内有效，通过 `recordMsgIdTimestamp()` 记录入站消息 ID 时间戳。

7. **发送频率限制**: Gateway 层内置防止 QQ 22007 错误（发送频率过高）的节流机制。

8. **前端代理**: Vite 开发模式下 `/api` → `http://localhost:3000`；`VITE_API_TARGET` 环境变量用于 Docker 环境（`http://backend:3000`）。

9. **构建分包**: 生产构建将 react、recharts、react-markdown、radix/ui 分离为独立 chunk，优化加载性能。

10. **移动端适配**: 底部导航栏（5入口）、滑动返回、安全区域适配（iOS刘海屏）、视图切换动画。

11. **Docker 部署**: 单端口模式（3000），Express 同时承载 API + WebSocket + 静态文件；MySQL/Redis 有 healthcheck；插件/数据/日志目录均持久化。

12. **OneBot Token**: 明文仅在创建时返回一次（`POST /api/onebot/tokens`），后续列表查询不暴露 token 值。

13. **数据上限**: `platformLogs` 最多 300 条，`systemLogs` 最多 1000 条，`messages` 最多 10000 条，`installLogs` 最多 100 条。

14. **JWT 密钥安全检查**: `ensureJwtSecretSafety()` 在 bootstrap 第一步执行，生产环境下若使用默认 `JWT_SECRET` 则 `process.exit(1)`，防止部署后使用不安全的默认密钥。

15. **Token 哈希存储**: OpenAPI Token 和 OneBot Token 在存储时使用 `hashToken()` (SHA-256) 哈希，验证时比较哈希值。明文 token 仅在创建时返回一次。

16. **原子文件写入**: `writeJsonFile` / `writeJsonFileSync` 采用先写 `.tmp` 文件再 `rename` 到目标路径的模式，防止写入中途崩溃导致文件损坏。启动时 `cleanupTmpFiles()` 清理残存的 `.tmp` 文件。

17. **进程崩溃数据保护**: `uncaughtException` / `unhandledRejection` 处理器调用 `syncSaveCriticalData()` 同步保存所有关键数据后再退出，防止崩溃丢失数据。

18. **虚拟滚动**: 聊天消息列表使用 `@tanstack/react-virtual` 的 `useVirtualizer`，`estimateSize: 80`, `overscan: 5`，新消息到达自动 `scrollToIndex`。

19. **骨架屏加载**: 所有 `React.lazy` 页面模块统一使用对应的 Skeleton 组件作为 `Suspense` fallback，替代传统的全局 loading spinner。

20. **错误边界**: `ErrorBoundary` 组件包裹所有路由内容，子组件渲染错误时显示友好回退 UI + Sonner Toast 通知。

21. **网络离线检测**: `useNetworkStatus` hook 监听 `online/offline` 事件，结合 `api.ts` 中的 `AbortController` 超时 (15s) 和 `navigator.onLine` 检测，在 `AppShell` 中显示离线横幅。

22. **ESLint + Prettier**: 根目录 ESLint Flat Config (`eslint.config.mjs`) + `.prettierrc`，通过 `npm run lint` / `npm run format` 执行。

23. **单元测试**: vitest 框架，测试文件位于 `backend/src/__tests__/`，共 25 个测试用例（auth: 9, store: 7, error-handler: 9）。通过 `npm run test -w backend` 运行。

24. **Docker 指数退避重启**: `docker-start.sh` 使用 `delay = min(60, 2^attempt)` 指数退避策略，避免进程频繁崩溃时容器日志爆炸。

25. **强制改密后端拦截**: `authMiddleware` 内置 `requirePasswordChange` 检查，使用 `req.originalUrl.split('?')[0]` 匹配白名单路径（防止 `app.use('/api', authMiddleware)` 导致 `req.path` 缺少前缀的问题）。

26. **Swagger 文档**: 通过 `swagger-jsdoc` + `swagger-ui-express` 在 `/api-docs` 提供交互式 API 文档，公开访问无需认证。
