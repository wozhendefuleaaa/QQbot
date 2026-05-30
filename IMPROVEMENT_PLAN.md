# Wawa-QQbot 改进计划

> 基于 2026-05-09 全项目综合分析和盘点的改进任务清单
>
> 分类: 🔴 P0 立即修复 | 🟡 P1 短期优化 | 🟢 P2 中期改进 | 🔵 P3 长期规划

---

## 目录

1. [P0 紧急修复](#p0-紧急修复)
   - [P0-1 JWT 密钥强制环境变量](#p0-1-jwt-密钥强制从环境变量读取)
   - [P0-2 强制改密后端拦截](#p0-2-requirepasswordchange-后端强制拦截)
   - [P0-3 Token 哈希存储](#p0-3-token-哈希存储)
   - [P0-4 Docker Compose 密码环境变量化](#p0-4-docker-compose-密码环境变量化)
   - [P0-5 进程异常退出数据保护](#p0-5-进程异常退出数据保护)
2. [P1 短期优化](#p1-短期优化)
   - [P1-1 App.tsx 拆分](#p1-1-apptsx-拆分)
   - [P1-2 核心模块单元测试](#p1-2-核心模块单元测试)
   - [P1-3 数据索引与存储优化](#p1-3-数据索引与存储优化)
   - [P1-4 SSE 事件扩展](#p1-4-sse-事件扩展)
   - [P1-5 生产环境错误消息通用化](#p1-5-生产环境错误消息通用化)
   - [P1-6 ESLint + Prettier 配置](#p1-6-eslint--prettier-配置)
   - [P1-7 Error Boundary + Sonner Toast](#p1-7-error-boundary--sonner-toast)
3. [P2 中期改进](#p2-中期改进)
   - [P2-1 plugin-manager.ts 职责拆分](#p2-1-plugin-managerts-职责拆分)
   - [P2-2 聊天消息虚拟滚动](#p2-2-聊天消息虚拟滚动)
   - [P2-3 加载骨架屏](#p2-3-加载骨架屏)
   - [P2-4 文件持久化原子写入](#p2-4-文件持久化原子写入)
   - [P2-5 OpenAPI/Swagger 文档](#p2-5-openapiswagger-文档)
   - [P2-6 Docker 进程重启退避策略](#p2-6-docker-进程重启退避策略)
   - [P2-7 离线/弱网检测](#p2-7-离线弱网检测)
4. [P3 长期规划](#p3-长期规划)
5. [各维度详细分析](#各维度详细分析)
6. [行业最佳实践合规性总结](#行业最佳实践合规性总结)

---

## P0 紧急修复

> 安全漏洞 / 数据完整性风险，必须立即处理

---

### P0-1 JWT 密钥强制从环境变量读取

**涉及文件**: [auth.ts](file:///root/wawa-qqbot/backend/src/core/auth.ts)

**当前问题**: 默认 JWT 密钥 `qqbot-jwt-secret-key-change-in-production` 硬编码，生产环境若不设环境变量则使用此已知值，攻击者可伪造任意 Token。

**详细步骤**:

1. 修改 [auth.ts](file:///root/wawa-qqbot/backend/src/core/auth.ts) 中的密钥初始化逻辑
2. 添加启动时校验函数 `ensureJwtSecretSafety()`:
   - 检查 `JWT_SECRET` 是否等于 `DEFAULT_JWT_SECRET`
   - 若相等且 `NODE_ENV === 'production'`，抛出 Error 拒绝启动
   - 若相等且 `NODE_ENV !== 'production'`，保留 console.warn 警告（现有行为）
3. 在 [app.ts](file:///root/wawa-qqbot/backend/src/core/app.ts) 的 `bootstrap()` 函数开头调用 `ensureJwtSecretSafety()`

**修改范围预估**: `auth.ts` 新增约 15 行校验函数，`app.ts` 新增 1 行调用

**完成效果**:
- 不设置 `JWT_SECRET` 时，开发环境: 黄色警告后正常启动
- 不设置 `JWT_SECRET` 时，生产环境: 进程拒绝启动，输出 `[FATAL] 生产环境必须设置 JWT_SECRET 环境变量` 后 `process.exit(1)`
- 设置了 `JWT_SECRET` 时: 无论什么环境都正常启动，无警告

**测试验证**:
```bash
# 测试1: 开发环境不设置密钥 — 应启动成功但打印警告
cd backend && NODE_ENV=development JWT_SECRET="" node dist/index.js
# 预期: 进程正常启动，console 输出黄色警告文本

# 测试2: 生产环境不设置密钥 — 应拒绝启动
NODE_ENV=production JWT_SECRET="" node dist/index.js
# 预期: 进程退出，退出码 1，stderr 输出 FATAL 错误信息

# 测试3: 生产环境设置了密钥 — 正常启动
NODE_ENV=production JWT_SECRET="my-real-secret-xxx" node dist/index.js
# 预期: 进程正常启动，无警告
```

---

### P0-2 requirePasswordChange 后端强制拦截

**涉及文件**: [middleware/auth.ts](file:///root/wawa-qqbot/backend/src/core/middleware/auth.ts)

**当前问题**: `requirePasswordChange` 标记仅前端弹窗，用户关闭弹窗后 API 仍可正常调用。

**详细步骤**:

1. 修改 `authMiddleware` 函数，在验证 Token 和加载用户后增加检查:
```typescript
if (req.user.requirePasswordChange) {
  const allowedPaths = ['/api/auth/change-password', '/api/auth/logout'];
  if (!allowedPaths.includes(req.path)) {
    return next(new ForbiddenError('请先修改默认密码后再继续操作'));
  }
}
```
2. 同样修改 `optionalAuthMiddleware`（如果用户已通过可选认证且需要改密）
3. 确保 changePassword API 成功后调用 `clearRequirePasswordChange()`
4. 检查 [auth/routes.ts](file:///root/wawa-qqbot/backend/src/modules/auth/routes.ts) 确认改密成功后清除了标记

**修改范围预估**: auth middleware 新增约 8 行，auth routes 可能需要微调

**完成效果**:
- 未改密的 admin 登录后，访问任何 API 返回 403，错误码 `FORBIDDEN`，消息 "请先修改默认密码后再继续操作"
- 仅 `/api/auth/change-password` 和 `/api/auth/logout` 两个端点可以访问
- 改密成功后，所有 API 恢复正常
- 前端虽是弹窗模式，但现在即便关闭弹窗也无法操作其他功能（API 层兜底）

**测试验证**:
```bash
# 1. 用默认密码 admin/admin123 登录，获取 Token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# 预期返回: { success:true, user:{ requirePasswordChange:true }, token:"..." }

# 2. 用该 Token 调用其他 API — 应被拒绝
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/accounts
# 预期: HTTP 403, {"error":"ForbiddenError","message":"请先修改默认密码后再继续操作"}

# 3. 修改密码
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"MyNewP@ssw0rd!"}'
# 预期: HTTP 200

# 4. 重新登录后用新密码调用其他 API — 应正常
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"MyNewP@ssw0rd!"}'
# 获取新 token 后访问 /api/accounts — HTTP 200
```

---

### P0-3 Token 哈希存储

**涉及文件**:
- [store.ts](file:///root/wawa-qqbot/backend/src/core/store.ts)（OpenAPI Token 模型）
- [onebot/auth.ts](file:///root/wawa-qqbot/backend/src/modules/onebot/auth.ts)（OneBot Token）
- [external/routes.ts](file:///root/wawa-qqbot/backend/src/modules/external/routes.ts)（OpenAPI Token 验证）
- [modules/openapi/routes.ts](file:///root/wawa-qqbot/backend/src/modules/openapi/routes.ts)（OpenAPI Token CRUD）

**当前问题**: Token 以明文存储于内存和磁盘 JSON 文件，泄露即完全暴露。

**详细步骤**:

1. 引入 Node.js 内置 crypto 模块，实现 `hashToken(rawToken)` 函数:
```typescript
import crypto from 'crypto';
function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
```

2. **OpenAPI Token 改造**:
   - 类型定义中 `token` 字段内部含义改为存储哈希值
   - 创建 Token 时: 生成原始值 -> SHA-256 哈希 -> 存储哈希值 -> 返回原始值给调用方（仅此一次）
   - 验证 Token 时: 对请求中的 token 做 SHA-256，与存储的哈希比对
   - Token 格式建议: 保持 `qqbot_<32字节随机hex>` 以便区分来源

3. **OneBot Token 改造**（同理）:
   - `createOneBotToken()` 生成原始值 -> 哈希存储 -> 返回原始值
   - `verifyOneBotBearerToken()` 验证时哈希比对

4. **磁盘持久化兼容**:
   - 现有磁盘上的明文 token 文件需要在首次加载时迁移: 读入 -> 哈希 -> 写回
   - 或直接在启动时检测是否需要迁移

**修改范围预估**: store.ts 新增 hash 工具函数 + 修改 Token 相关 10 行，auth.ts 修改 15 行，routes 各修改 3-5 行

**完成效果**:
- 内存中的 `openApiTokens` 数组，`token` 字段存储的是 SHA-256 哈希值，不再是明文
- 磁盘 `data/openapi-tokens.json` 中 token 字段也是哈希值
- 创建 API 返回时，显示的是一次性的明文 token（仅此一次可见）
- 请求验证时，对 Bearer token 做 SHA-256 后与存储哈希比对，验证通过
- OneBot token 同理

**测试验证**:
```bash
# 1. 创建一个 OpenAPI Token
curl -X POST http://localhost:3000/api/openapi/tokens \
  -H "Authorization: Bearer <admin_jwt>" \
  -H "Content-Type: application/json" \
  -d '{"name":"test-token"}'
# 预期返回: {"id":"...","name":"test-token","token":"qqbot_xxxx..."} - 明文仅此一次

# 2. 检查磁盘文件
cat backend/data/openapi-tokens.json
# 预期: token 字段为 64 位 hex 字符串（SHA-256），不是上面的 qqbot_xxxx

# 3. 用创建的 token 调用外部 API
curl -H "Authorization: Bearer qqbot_xxxx..." http://localhost:3000/api/external/status
# 预期: HTTP 200，正常返回状态

# 4. 用错误 token 调用
curl -H "Authorization: Bearer fake_token" http://localhost:3000/api/external/status
# 预期: HTTP 401，INVALID_TOKEN
```

---

### P0-4 Docker Compose 密码环境变量化

**涉及文件**:
- [docker-compose.yml](file:///root/wawa-qqbot/docker-compose.yml)
- [.env.example](file:///root/wawa-qqbot/.env.example)

**当前问题**: `MYSQL_ROOT_PASSWORD: root` 和 `MYSQL_PASSWORD: qqbot` 硬编码。

**详细步骤**:

1. 修改 `docker-compose.yml`:
```yaml
mysql:
  environment:
    MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-root}
    MYSQL_DATABASE: ${MYSQL_DATABASE:-qqbot}
    MYSQL_USER: ${MYSQL_USER:-qqbot}
    MYSQL_PASSWORD: ${MYSQL_PASSWORD:-qqbot}
```

2. 更新 `.env.example`，新增数据库密码相关变量及注释:
```
# === 数据库配置（docker-compose 使用） ===
MYSQL_ROOT_PASSWORD=change_me_root_password
MYSQL_DATABASE=qqbot
MYSQL_USER=qqbot
MYSQL_PASSWORD=change_me_user_password
```

3. 更新 `docker-compose.yml` 中 qqbot 服务的 `DB_PASSWORD` 也改为 `${MYSQL_PASSWORD:-qqbot}`

4. 检查 `.env.example` 中 `DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD` 与 docker-compose 保持一致

**修改范围预估**: docker-compose.yml 改 5-10 行，.env.example 新增 5 行

**完成效果**:
- docker-compose.yml 中无任何明文密码
- `.env.example` 提供完整变量模板，值为 `change_me_xxx` 提示用户修改
- 不设置环境变量时使用 `:-fallback` 兜底（开发体验不变）
- 生产部署时必通过 `.env` 文件注入真实密码

**测试验证**:
```bash
# 1. 不设置环境变量 — 使用兜底默认值启动
docker compose up -d mysql
docker compose logs mysql | grep "ready for connections"
# 预期: MySQL 正常启动

# 2. 创建 .env 文件设置新密码
echo "MYSQL_ROOT_PASSWORD=my_secure_root" > .env
echo "MYSQL_PASSWORD=my_secure_user" >> .env

# 3. 重启数据库
docker compose down -v && docker compose up -d mysql
# 预期: MySQL 使用新密码启动正常

# 4. 确认环境变量已生效
docker compose exec mysql mysql -u root -pmy_secure_root -e "SELECT 1"
# 预期: 连接成功
```

---

### P0-5 进程异常退出数据保护

**涉及文件**: [app.ts](file:///root/wawa-qqbot/backend/src/core/app.ts)

**当前问题**: 仅处理 SIGINT/SIGTERM，未处理 `unhandledRejection` 和 `uncaughtException`。

**详细步骤**:

1. 在 `setupProcessExitHooks()` 函数中，**在现有 SIGINT/SIGTERM 处理之前**，新增两个处理器:
```typescript
process.on('uncaughtException', (error) => {
  addSystemLog('ERROR', 'framework', `未捕获异常: ${error.message}\n${error.stack}`);
  // 同步写入关键数据
  try { fs.writeFileSync(/* 关键数据路径 */); } catch {}
  console.error('[FATAL] uncaughtException:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  addSystemLog('ERROR', 'framework', `未处理的 Promise 拒绝: ${reason}`);
  try { fs.writeFileSync(/* 关键数据路径 */); } catch {}
  console.error('[FATAL] unhandledRejection:', reason);
  process.exit(1);
});
```

2. **注意**: crash handler 中应优先使用同步写入降级方案（fs.writeFileSync）
3. 保守策略: 任何 uncaughtException 视为不可恢复，落盘后退出

**修改范围预估**: app.ts 新增约 20 行

**完成效果**:
- 任何未捕获的同步异常触发后，系统日志记录错误详情，数据落盘，进程退出
- 任何未处理的 Promise 拒绝触发后，同上处理
- 退出前日志文件中能看到 `[FATAL]` 级别的错误记录

**测试验证**:
```bash
# 1. 启动后端后，在代码中临时插入测试:
# setTimeout(() => { Promise.reject(new Error('test crash')) }, 2000)
# 预期: 进程退出，控制台输出 [FATAL] unhandledRejection

# 2. 检查消息是否落盘
cat backend/data/messages.json
# 预期: 最后更新时间在 crash 时间附近
```

---

## P1 短期优化

> 1-2 周内完成，显著提升代码质量和可维护性

---

### P1-1 App.tsx 拆分

**涉及文件**: [App.tsx](file:///root/wawa-qqbot/webui/src/App.tsx)

**当前问题**: 977 行单文件，包含 16 个 useQuery + 20+ 个 useMutation + 所有 state + 所有 handler + 完整的 JSX 渲染树。

**详细步骤**:

**第一步: 创建功能 Hooks 目录** `webui/src/hooks/`，新建以下文件:
- `useAccounts.ts` — 封装 accounts query、createAccount/toggleAccount/createOneBotAccount/createOneBotToken mutations
- `useChat.ts` — 封装 conversations/messages query、sendMessage mutation、selectedConversationId state
- `usePlatform.ts` — 封装 platformStatus/platformLogs/oneBotStatus  queries、connect/disconnect mutations
- `usePlugins.ts` — 封装 plugins/pluginConfig queries、toggle/reload/delete/upload/saveSource mutations
- `useOpenApi.ts` — 封装 openApi query、create/toggle/delete Token mutations
- `useConfig.ts` — 封装 config query、saveConfig mutation
- `useStatistics.ts` — 封装 statistics query
- `useLogs.ts` — 封装 logs query + logType state

每个 Hook 返回 `{ data, mutations, actions }` 结构，由 App.tsx 消费。

**第二步: 创建视图容器组件** `webui/src/components/layout/`:
- `AppShell.tsx` — 主布局（Sidebar + MobileNav + Header），接收 `activeMenu` + `onNavigate` + children

**第三步: 重写 App.tsx**，仅保留:
- 认证检查（`isAuthenticated`、`isLoading`、`requirePasswordChange`）
- 调用各 Hook 获取数据和 actions
- 路由分发（`{activeMenu === 'home' && <HomePage .../>}`）
- 目标行数: < 200 行

**修改范围预估**: 新建 8 个 Hook 文件 ~400 行，新建 AppShell ~50 行，App.tsx 从 977 -> ~200 行

**完成效果**:
- App.tsx 从 977 行缩减到 ~200 行，成为一个纯粹的路由分发 + 布局组件
- 每个 `useXxx.ts` 文件约 50-100 行，职责单一
- 各 Hook 可独立测试、独立修改，互不影响
- 新增功能时只需修改对应 Hook，不再触碰 App.tsx

**测试验证**:
```bash
# 1. 类型检查
cd webui && npx tsc --noEmit
# 预期: 无类型错误

# 2. 功能回归测试 - 启动前端开发服务器，手动检查:
#   - 登录 -> 首页数据加载 -> 账号管理 CRUD -> 聊天消息收发
#   - 平台连接/断开 -> 配置保存 -> 插件管理 -> 日志查看
#   - 移动端导航切换正常

# 3. 构建测试
npm run build -w webui
# 预期: 构建成功，产物正常
```

---

### P1-2 核心模块单元测试

**涉及文件**: 新建 `backend/src/**/__tests__/` 目录下的测试文件

**当前问题**: 项目无任何自动化测试。

**详细步骤**:

1. **安装测试框架**:
```bash
cd backend && npm install -D vitest @types/node
```
在 `backend/package.json` 添加脚本: `"test": "vitest run"`

2. **编写 `src/core/auth.test.ts`**（预计 20+ 测试用例）:
   - `hashPassword()` 生成的哈希长度正确、不可逆
   - `verifyPassword()` 正确密码通过、错误密码拒绝
   - `generateToken()` 返回有效 JWT，payload 含 userId/username/role
   - `verifyToken()` 有效 token 返回 payload、无效/过期 token 返回 null
   - `createUser()` 成功创建、重名报错
   - `findUserByUsername()` / `findUserById()` 正确查找
   - `changePassword()` 成功后新密码可验证
   - `isUsingDefaultPassword()` 判断正确
   - `getTokenExpiresIn()` 各后缀解析正确（s/m/h/d）

3. **编写 `src/core/store.test.ts`**（预计 15+ 测试用例）:
   - `readJsonFile()` 正常读、文件不存在返回 null
   - `writeJsonFile()` + `readJsonFile()` 读写一致性
   - `maskSecret()` 脱敏正确
   - `ensureConversationForInbound()` 新建会话 + 追加消息
   - `scheduleSaveChatDataToDisk()` / `flushSaveChatDataToDisk()` 防抖逻辑
   - `buildStatisticsSnapshot()` 统计值正确
   - `addPlatformLog()` / `addSystemLog()` 上限截断

4. **编写 `src/core/middleware/auth.test.ts`**（预计 10+ 测试用例）:
   - valid Token -> next() 调用
   - invalid/missing Token -> next(error)
   - `optionalAuthMiddleware`: 有 Token 则验证，无则跳过
   - `requireRole('admin')`: admin 通过、user 拒绝、未认证拒绝
   - 集成 P0-2: `requirePasswordChange=true` 时的拦截行为

5. **编写 `src/core/middleware/error-handler.test.ts`**（预计 10+ 测试用例）:
   - 各类 AppError 子类的状态码和响应体
   - SyntaxError（JSON 解析错误）返回 400
   - 未知错误在生产/开发环境的不同响应
   - `asyncHandler()` 正确传递错误到 next

6. **编写 `src/modules/platform/gateway-core.test.ts`**（预计 8+ 测试用例）:
   - 需要 mock `ws` 库
   - `connectGateway()` 的 token 获取、重连调度
   - `disconnectGateway()` 的清理逻辑
   - `scheduleReconnect()` 的指数退避计算

**完成效果**:
```bash
$ npm run test -w backend

 ✓ src/core/auth.test.ts (22 tests)
 ✓ src/core/store.test.ts (18 tests)
 ✓ src/core/middleware/auth.test.ts (12 tests)
 ✓ src/core/middleware/error-handler.test.ts (10 tests)
 ✓ src/modules/platform/gateway-core.test.ts (8 tests)

 Tests  70 passed (70)
```

**测试验证**:
```bash
# 运行全部测试
cd backend && npx vitest run

# 带覆盖率
cd backend && npx vitest run --coverage
# 预期: auth.ts 覆盖率 > 90%，store.ts > 80%，middleware > 90%

# 确保构建不受测试文件影响
npm run build -w backend
# 预期: 构建成功
```

---

### P1-3 数据索引与存储优化

**涉及文件**: [store.ts](file:///root/wawa-qqbot/backend/src/core/store.ts)

**当前问题**: conversations/messages 为纯数组，查找 O(n)，统计数据每次都全量遍历。

**详细步骤**:

1. 建立索引 Map（不改变原有数组，新增索引为内部查询优化）:
```typescript
const conversationById = new Map<string, Conversation>();
const messagesByConversationId = new Map<string, Message[]>();
```

2. 每次数组变动后同步更新索引，或创建辅助查找函数优先从索引查询

3. 统计快照增量化:
   - 维护全局计数器: `statsInboundCount`、`statsOutboundCount`
   - 每次 `messages.push()` 时同步增减计数器
   - `buildStatisticsSnapshot()` 直接读取计数器，不再遍历 messages
   - Top5 群组/用户改为维护 Map 并在消息创建时更新

4. 数据上限时同步清理索引（messages 超过 10000 条时）

**修改范围预估**: store.ts 新增约 60 行索引管理 + 修改约 20 行查找逻辑

**完成效果**:
- `ensureConversationForInbound()` 查找会话从 O(n) -> O(1)
- `buildStatisticsSnapshot()` 从遍历所有 messages -> O(1) 读取计数
- 10000 条消息时统计接口响应从数十毫秒降到个位数毫秒

**测试验证**:
```bash
# 1. 所有单元测试无回归
npm run test -w backend

# 2. 性能对比: 在测试中写入 5000 条消息后调用 buildStatisticsSnapshot
# 预期: 优化后 < 5ms（优化前可能 20-50ms）

# 3. 数据一致性: 索引 Map 与数组元素一一对应
```

---

### P1-4 SSE 事件扩展

**涉及文件**:
- [sse/routes.ts](file:///root/wawa-qqbot/backend/src/modules/sse/routes.ts)
- [store.ts](file:///root/wawa-qqbot/backend/src/core/store.ts)（数据变更点触发广播）
- [plugin-manager.ts](file:///root/wawa-qqbot/backend/src/core/plugin-manager.ts)（插件状态变更点）
- [App.tsx](file:///root/wawa-qqbot/webui/src/App.tsx)（前端消费事件）

**当前问题**: SSE 仅推送 3 种事件，前端 16 个 useQuery 大量依赖轮询（最短 5 秒）。

**详细步骤**:

1. 在 sse/routes.ts 中新增 SSE 广播函数:
   - `broadcastAccountUpdate(accountId)` -> 事件 `account_update`
   - `broadcastPluginStatus(pluginId, status)` -> 事件 `plugin_status`
   - `broadcastConfigChange()` -> 事件 `config_change`
   - `broadcastStatisticsUpdate()` -> 事件 `statistics_update`

2. 在数据变更点调用广播:
   - `saveAccountsToDisk()` 后 -> `broadcastAccountUpdate()`
   - toggle/reload/delete plugin 后 -> `broadcastPluginStatus()`
   - `saveAppConfigToDisk()` 后 -> `broadcastConfigChange()`
   - 定时每 30s 广播一次统计更新

3. 创建 `webui/src/hooks/useSseEvents.ts`，建立 SSE 连接并监听事件:
   - 收到 `account_update` -> `queryClient.invalidateQueries({ queryKey: ['accounts'] })`
   - 收到 `plugin_status` -> `queryClient.invalidateQueries({ queryKey: ['plugins'] })`
   - 收到 `config_change` -> `queryClient.invalidateQueries({ queryKey: ['config'] })`
   - 收到 `statistics_update` -> `queryClient.invalidateQueries({ queryKey: ['statistics'] })`

4. 将原来的 `refetchInterval: 30000` 等改为 `refetchInterval: false`（事件驱动 + 首次加载），保留关键数据的适度轮询

**修改范围预估**: sse/routes.ts 新增 20 行，plugin-manager/store 新增约 8 处调用，前端新增 useSseEvents.ts ~40 行 + 修改 App.tsx 中 query 配置

**完成效果**:
- 账号/插件/配置变更后 1 秒内前端自动刷新
- 前端 HTTP 请求量减少 60-70%（不再靠无差别轮询）
- 平台状态、聊天消息等高频数据保留适度轮询

**测试验证**:
```bash
# 1. DevTools Network -> 观察 /api/sse/events 长连接

# 2. 操作: 启用/禁用插件 -> plugins API 自动刷新一次
#    修改配置保存 -> config API 自动刷新
#    创建新账号 -> accounts API 自动刷新

# 3. 观察轮询请求数量减少
```

---

### P1-5 生产环境错误消息通用化

**涉及文件**:
- [middleware/error-handler.ts](file:///root/wawa-qqbot/backend/src/core/middleware/error-handler.ts)
- 各处 `catch` 块返回错误的代码

**当前问题**: `catch` 块中 `String(error)` 直接返回客户端，可能暴露 Gateway URL、内部端口等敏感信息。

**详细步骤**:

1. 修改全局 error-handler: 非 AppError 在生产环境返回通用消息，写入系统日志保留详情

2. 逐个审查路由中的 catch 块，统一使用 AppError 子类:
   - `external/routes.ts` 中的 `res.status(500).json({ error: String(error) })` -> 使用 `next(new AppError(..., 500))`
   - 其他所有模块的路由 catch 块统一化

3. 建立错误响应规范:
```typescript
// 好的实践
throw new AppError('账号不存在', 404, true, 'ACCOUNT_NOT_FOUND');
// 避免
res.status(500).json({ error: String(error) });
```

**修改范围预估**: error-handler.ts 改 5 行，各路由 catch 块统一化约 15 处

**完成效果**:
- 生产环境下，所有 500 错误返回 `{"error":"InternalServerError","message":"服务器内部错误"}`
- 详细错误信息写入系统日志，运维可通过日志 API 排查
- 开发环境保持不变，返回详细错误信息

**测试验证**:
```bash
# 生产模式
NODE_ENV=production node dist/index.js

# 触发错误操作 -> HTTP 500，返回通用消息，不泄露任何内部信息
# 查看系统日志确认详细信息已记录
```

---

### P1-6 ESLint + Prettier 配置

**涉及文件**: 项目根目录新建配置，修改 `package.json` scripts

**详细步骤**:

1. 安装依赖（根目录）:
```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier eslint-plugin-react-hooks
```

2. 创建 `eslint.config.js`（根目录），配置:
   - backend TS 规则: no-console warn、no-explicit-any warn
   - webui TSX 规则: react-hooks rules-of-hooks error

3. 创建 `.prettierrc`（根目录）: semi、singleQuote、trailingComma、printWidth

4. 更新 package.json scripts:
   - 根: `"lint": "eslint ."`、`"format": "prettier --write ."`
   - backend: `"typecheck": "tsc --noEmit"`
   - webui: `"typecheck": "tsc --noEmit"`

5. 创建 `.vscode/settings.json` 配置保存自动格式化

6. 执行全量: `npm run format && npm run lint -- --fix`

**修改范围预估**: 新增 3 个配置文件 + 修改 3 个 package.json

**完成效果**:
- `npm run lint` 无 error（首次允许有 warn）
- `npm run format` 全项目代码风格统一
- VS Code 保存时自动格式化

**测试验证**:
```bash
npm run format      # prettier 遍历所有文件自动修复
npm run lint        # 预期 0 errors
npm run typecheck -w backend  # 无类型错误
npm run typecheck -w webui    # 无类型错误
```

---

### P1-7 Error Boundary + Sonner Toast

**涉及文件**:
- 新建 `webui/src/components/ui/error-boundary.tsx`
- [App.tsx](file:///root/wawa-qqbot/webui/src/App.tsx)（集成 Error Boundary + 替换 notice 为 toast）

**详细步骤**:

1. 创建 `ErrorBoundary` 类组件:
   - `getDerivedStateFromError` 捕获错误 -> 显示降级 UI
   - 降级 UI 包含: "页面加载出错" 文本 + 错误消息 + "重试"按钮

2. 包裹每个 `React.lazy()` 组件:
```tsx
{activeMenu === 'accounts' && <ErrorBoundary><AccountsPanel ... /></ErrorBoundary>}
```

3. 替换通知系统为 Sonner Toast:
   - 删除 App.tsx 中 `notice`/`noticeSeverity`/`showNotice` 等状态和函数
   - 所有 mutation 的 `onSuccess` 改为 `toast.success(...)`
   - 所有 mutation 的 `onError` 改为 `toast.error(...)`
   - 添加 `<Toaster />` 组件

**修改范围预估**: 新建 error-boundary.tsx ~40 行，App.tsx 删除 ~50 行 + 新增 ~20 行

**完成效果**:
- 任意懒加载模块渲染出错时，显示友好降级 UI + 重试按钮，不白屏
- 通知从页面内嵌 notice bar 变为右上角 sonner toast
- 操作反馈更自然（绿色成功、红色错误）

**测试验证**:
```bash
# 1. 在 AccountsPanel 中临时 throw Error -> 切换到账号页面时显示降级 UI
# 2. 创建账号 -> 右上角绿色 toast
# 3. 确认旧的 notice bar 已不存在
```

---

## P2 中期改进

> 1 个月内完成

---

### P2-1 plugin-manager.ts 职责拆分

**涉及文件**: [plugin-manager.ts](file:///root/wawa-qqbot/backend/src/core/plugin-manager.ts)（~1400 行 -> 拆分为 5 个文件）

**当前问题**: 单文件 1400+ 行，包含插件加载/卸载/消息分发/命令解析/权限检查/cron 调度等多项职责。

**详细步骤**:

1. **`plugin-loader.ts`**（~200 行）— 文件扫描与加载:
   - 移植: `loadAllPlugins()`、`loadPluginFromFile()`、`getPluginsDir()`
   - 目录扫描、npm 依赖安装与重试

2. **`plugin-router.ts`**（~250 行）— 消息分发与命令匹配:
   - `dispatchMessage()`、命令解析、优先级排序、帮助命令生成

3. **`plugin-cron.ts`**（~150 行）— 定时任务调度:
   - cron 表达式解析、定时器注册与卸载

4. **`plugin-lifecycle.ts`**（~100 行）— 插件生命周期:
   - 加载/卸载/热重载、loadedPlugins Map、资源清理

5. **`plugin-permissions.ts`**（~80 行）— 权限矩阵:
   - `isPluginDisabled()`、云崽权限检查

6. **`plugin-manager.ts` 改为桶文件（barrel export）**，重新导出所有 API，保持向后兼容

**修改范围预估**: 新建 5 个文件共 ~800 行，plugin-manager.ts 缩减为 ~50 行导出

**完成效果**:
- 每个文件 < 300 行，职责单一，可独立理解和测试
- 外部导入路径不变: `import { dispatchMessage } from './plugin-manager.js'` 仍然有效

**测试验证**:
```bash
npm run build -w backend     # tsc 编译无错误
npm run dev:backend          # 插件正常加载
npm run test -w backend      # 已有测试无回归
# WebUI 测试 toggle/reload/delete 操作正常
```

---

### P2-2 聊天消息虚拟滚动

**涉及文件**: `webui/src/modules/chat/` 中的消息列表组件

**详细步骤**:

1. 安装 `@tanstack/react-virtual`

2. 识别消息列表组件，改造为虚拟滚动:
   - 使用 `useVirtualizer` Hook
   - `estimateSize: () => 80`（每条消息估算高度）
   - 仅渲染可视区域内的 ~20 条消息 DOM 节点

3. 处理变高消息: 动态测量或增大 estimateSize

4. 新消息到达时自动滚动到底部

**修改范围预估**: 修改 1 个聊天组件文件，新增约 40 行

**完成效果**:
- 1000 条消息场景下，DOM 节点从 1000+ 降到 ~20（仅可视区域）
- 滚动流畅，Chrome Performance 录制每帧 < 16ms

**测试验证**:
```bash
# 加载大量消息会话 -> 页面加载快，滚动流畅，无卡顿
# DevTools Performance 录制 -> 无长任务 (long task)
# 新消息自动滚动到底部，快速来回滚动无空白
```

---

### P2-3 加载骨架屏

**涉及文件**: 新建 `webui/src/components/ui/skeleton.tsx`，修改各面板 Suspense fallback

**详细步骤**:

1. 安装 shadcn/ui skeleton 组件

2. 创建各面板骨架屏: HomePageSkeleton、AccountsPanelSkeleton、ChatPanelSkeleton 等

3. 替换每个 Suspense fallback:
```tsx
<Suspense fallback={<HomePageSkeleton />}>
  <HomePage ... />
</Suspense>
```

**修改范围预估**: 新建 skeleton.tsx 含各面板骨架，App.tsx 替换 9 处 fallback

**完成效果**: 页面切换时展示与真实布局一致的灰白色脉冲骨架屏，感知性能大幅提升

**测试验证**:
```bash
# 切换各面板 -> 先看到骨架屏，然后数据渲染
# Slow 3G 模式下骨架屏展示时间更长，体验远好于纯 loading
# 确认渲染后骨架屏消失，无 DOM 残留
```

---

### P2-4 文件持久化原子写入

**涉及文件**: [store.ts](file:///root/wawa-qqbot/backend/src/core/store.ts)

**详细步骤**:

1. 实现 `atomicWriteJsonFile()`: 写入临时文件 -> 写入完成 -> POSIX atomic rename 覆盖

2. 替换所有 `writeJsonFile` 调用为 `atomicWriteJsonFile`

3. 写入队列优化（chat data 高频场景）: 序列化写入，合并短时间内的多次写入

4. 启动时清理残留 `.tmp.*` 文件

**修改范围预估**: store.ts 新增约 40 行 + 修改约 10 行调用

**完成效果**: 写入操作要么完全成功，要么完全不生效。写入中崩溃 -> 下次启动数据完整

**测试验证**:
```bash
# 写入中 kill -9 -> 重启后 JSON 文件完整无截断
# 并发写入 10 次 -> 数据完整，无重复或丢失
# 残留 .tmp 文件 -> 重启自动清理
```

---

### P2-5 OpenAPI/Swagger 文档

**涉及文件**:
- 新建 `backend/src/swagger.ts`
- [app.ts](file:///root/wawa-qqbot/backend/src/core/app.ts)（注册 Swagger 路由）
- 各路由文件（添加 JSDoc 注释）

**详细步骤**:

1. 安装 `swagger-jsdoc` + `swagger-ui-express`

2. 创建 `swagger.ts` 配置 Swagger 规范（info、servers、securitySchemes）

3. 在 app.ts 注册: `app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))`

4. 为高频模块路由添加 JSDoc 注释（auth/accounts/chat/platform/plugins/external）

**修改范围预估**: 新建 swagger.ts ~30 行，app.ts 新增 3 行，路由注释共约 200 行

**完成效果**: 访问 `http://localhost:3000/api-docs` 查看交互式 Swagger UI，可在线测试所有 API

**测试验证**:
```bash
curl http://localhost:3000/api-docs  # 返回 Swagger UI HTML
# 在浏览器中输入 Bearer Token -> Authorize -> Try it out -> Execute
# 文档覆盖所有模块 API（Tags: Auth/Accounts/Chat/Platform/Plugins/Config/External）
```

---

### P2-6 Docker 进程重启退避策略

**涉及文件**: [docker-start.sh](file:///root/wawa-qqbot/docker-start.sh)

**详细步骤**:

修改监控循环，实现:
- 首次崩溃: 1s 后重启，第 N 次: 2^N 秒延迟
- 最大延迟: 60s（封顶）
- 稳定运行 30s 后重置退避计数器

**修改范围预估**: docker-start.sh 改约 15 行

**完成效果**: crash loop 不再反复消耗 CPU，连续崩溃间隔逐步增大

**测试验证**:
```bash
docker compose exec qqbot kill -9 $(pgrep -f "node backend/dist")
docker compose logs -f qqbot
# 预期: 1s -> 2s -> 4s -> ... -> 60s（封顶）
# 稳定运行 >30s 后 kill -> 退避从 1s 重新开始
```

---

### P2-7 离线/弱网检测

**涉及文件**:
- [api.ts](file:///root/wawa-qqbot/webui/src/services/api.ts)
- 新建 `webui/src/hooks/useNetworkStatus.ts`
- [App.tsx](file:///root/wawa-qqbot/webui/src/App.tsx)

**详细步骤**:

1. 创建 `useNetworkStatus` Hook: 监听 `navigator.onLine` + window online/offline 事件

2. 修改 api.ts: 添加 15s 超时（AbortController）、区分 timeout/offline 错误给出友好提示

3. 在 AppShell 添加离线横幅: 红色 "网络连接已断开" 提示

**修改范围预估**: 新建 useNetworkStatus.ts ~25 行，api.ts 改 ~15 行，App.tsx 新增 5 行

**完成效果**:
- 断网 -> 红色横幅提示，恢复 -> 自动消失
- 请求超时/断网 -> 友好错误提示而非空白
- 固定提示不再干扰操作

**测试验证**:
```bash
# DevTools Network -> Offline -> 红色横幅出现
# 切换回 Online -> 横幅消失
# Offline 状态操作 -> toast 显示网络错误提示
# Slow 3G -> 正常完成或超时显示明确提示
```

---

## P3 长期规划

---

### P3-1 水平扩展支持

**目标**: 支持多实例部署（PM2 cluster / K8s Pod）

**方案**: Redis 共享状态（conversations/messages 索引、session 存储、分布式锁），Gateway WebSocket sticky session 或消息总线解耦

**完成效果**: 可通过 `pm2 start dist/index.js -i 4` 或 `kubectl scale --replicas=3` 水平扩容

---

### P3-2 集成测试 + E2E 测试

**目标**: API 集成测试 + 前端关键路径 E2E

**方案**: supertest 做 API 集成测试；Playwright 做前端 E2E（登录 -> 首页 -> 账号 -> 聊天 -> 插件 -> 登出）

**完成效果**: `npm run test:e2e` 一键运行全链路自动化测试

---

### P3-3 全面无障碍（a11y）适配

**目标**: WCAG 2.1 AA 合规

**方案**: ARIA 标签、键盘导航（Tab/Enter/Escape）、屏幕阅读器兼容、色彩对比度 >= 4.5:1

---

### P3-4 MySQL/Redis 正式持久化

**目标**: JSON 文件存储升级为数据库

**方案**: MySQL 存储结构化数据（accounts/users/conversations/messages/plugins/config），Redis 做缓存（Token/会话/在线状态），提供一键迁移脚本，保留文件系统降级

---

### P3-5 CI/CD Pipeline

**目标**: 自动化构建、测试、部署

**方案**: GitHub Actions，包含 lint -> typecheck -> test -> build -> docker push -> deploy 流水线

---

### P3-6 安全加固

**目标**: 生产级安全防护

**方案**: Helmet.js 安全头、CSP 策略、CSRF Token、请求体分级限制、SQL 注入防护审查

---

## 各维度详细分析

### 架构与设计

| # | 问题 | 文件 | 风险 |
|---|------|------|------|
| A1 | App.tsx 过于臃肿（977 行，20+ mutations，16 queries） | [App.tsx](file:///root/wawa-qqbot/webui/src/App.tsx) | 🔴 |
| A2 | 全局可变状态无并发保护 | [store.ts](file:///root/wawa-qqbot/backend/src/core/store.ts) | 🔴 |
| A3 | 文件持久化无原子写入保证 | [store.ts](file:///root/wawa-qqbot/backend/src/core/store.ts#L274-L279) | 🟡 |
| A4 | Gateway 重连存在竞态窗口 | [gateway-core.ts](file:///root/wawa-qqbot/backend/src/modules/platform/gateway-core.ts) | 🟡 |
| A5 | dataDir 路径推导逻辑脆弱 | [store.ts](file:///root/wawa-qqbot/backend/src/core/store.ts#L46-L48) | 🟡 |

### 安全性

| # | 问题 | 文件 | 风险 |
|---|------|------|------|
| S1 | 默认 JWT 密钥硬编码 | [auth.ts](file:///root/wawa-qqbot/backend/src/core/auth.ts#L10) | 🔴 |
| S2 | requirePasswordChange 仅前端拦截 | [auth.ts](file:///root/wawa-qqbot/backend/src/core/auth.ts#L16) | 🔴 |
| S3 | Token 明文存储 | [store.ts](file:///root/wawa-qqbot/backend/src/core/store.ts#L25) | 🔴 |
| S4 | docker-compose 硬编码密码 | [docker-compose.yml](file:///root/wawa-qqbot/docker-compose.yml#L6-L8) | 🔴 |
| S5 | 开发环境 CORS `origin: '*'` | [app.ts](file:///root/wawa-qqbot/backend/src/core/app.ts#L58-L60) | 🟡 |
| S6 | 错误消息暴露内部信息 | 多处 catch 块 | 🟡 |
| S7 | ID 生成使用 `Math.random()`（非加密安全） | [store.ts](file:///root/wawa-qqbot/backend/src/core/store.ts#L29) | 🟡 |

### 代码质量

| # | 问题 | 文件 | 风险 |
|---|------|------|------|
| Q1 | 无单元测试 | 全局 | 🔴 |
| Q2 | 无 ESLint/Prettier 配置 | 全局 | 🟡 |
| Q3 | plugin-manager.ts 超 1400 行 | [plugin-manager.ts](file:///root/wawa-qqbot/backend/src/core/plugin-manager.ts) | 🟡 |
| Q4 | 魔法数字散布各处 | 多处 | 🟡 |
| Q5 | 注释风格不统一（中英混用） | 全局 | 🟢 |
| Q6 | `any` 类型使用破坏类型安全 | [gateway-error.ts](file:///root/wawa-qqbot/backend/src/modules/platform/gateway-error.ts#L24) | 🟢 |
| Q7 | 空 catch 块不记录日志 | [gateway-core.ts](file:///root/wawa-qqbot/backend/src/modules/platform/gateway-core.ts#L331-L333) | 🟢 |
| Q8 | 部分文件无注释 | 多处 | 🟢 |

### 性能与可扩展性

| # | 问题 | 文件 | 风险 |
|---|------|------|------|
| P1 | conversations/messages 线性扫描 O(n) | [store.ts](file:///root/wawa-qqbot/backend/src/core/store.ts) | 🔴 |
| P2 | 前端大量轮询而非 SSE 推送 | [App.tsx](file:///root/wawa-qqbot/webui/src/App.tsx) | 🟡 |
| P3 | 文件全量 JSON 写入 IO 压力大 | [store.ts](file:///root/wawa-qqbot/backend/src/core/store.ts) | 🟡 |
| P4 | 进程异常退出数据保护不完整 | [app.ts](file:///root/wawa-qqbot/backend/src/core/app.ts#L231-L249) | 🟡 |
| P5 | SSE 客户端无心跳超时清理 | [sse/routes.ts](file:///root/wawa-qqbot/backend/src/modules/sse/routes.ts) | 🟢 |
| P6 | 多进程/集群不支持（内存状态） | 全局 | 🟡 |
| P7 | Docker 进程无重启退避 | [docker-start.sh](file:///root/wawa-qqbot/docker-start.sh#L58-L65) | 🟢 |
| P8 | Gateway 重连计数器不重置 | [gateway-core.ts](file:///root/wawa-qqbot/backend/src/modules/platform/gateway-core.ts#L131-L132) | 🟢 |

### 前端与用户体验

| # | 问题 | 文件 | 风险 |
|---|------|------|------|
| U1 | 无全局 Error Boundary | [App.tsx](file:///root/wawa-qqbot/webui/src/App.tsx) | 🟡 |
| U2 | 无离线/弱网提示 | [api.ts](file:///root/wawa-qqbot/webui/src/services/api.ts) | 🟡 |
| U3 | 加载骨架屏缺失 | [App.tsx](file:///root/wawa-qqbot/webui/src/App.tsx#L786-L808) | 🟢 |
| U4 | 聊天消息无虚拟滚动 | chat 模块 | 🟡 |
| U5 | 无障碍 (a11y) 不足 | 全局 | 🟢 |
| U6 | sonner toast 已引入但未充分利用 | [App.tsx](file:///root/wawa-qqbot/webui/src/App.tsx) | 🟢 |

### 文档与可维护性

| # | 问题 | 方案 |
|---|------|------|
| D1 | 无面向开发者的贡献指南 | 编写 DEVELOPER.md |
| D2 | 无 API Swagger 文档 | 引入 swagger-jsdoc + swagger-ui-express |
| D3 | 无 CHANGELOG / 版本管理 | 语义化版本 + CHANGELOG.md |
| D4 | 环境变量清单不完整 | 完善 .env.example，包含所有变量说明 |

---

## 行业最佳实践合规性总结

| 方面 | 合规状态 | 说明 |
|------|----------|------|
| TypeScript strict mode | ✅ 合规 | 后端 `strict: true` |
| ESM 模块化 | ✅ 合规 | 全项目 ESM |
| RESTful API 设计 | ✅ 基本合规 | 命名清晰 |
| 认证机制 (JWT) | ⚠️ 部分合规 | 默认密钥和强制改密不足 |
| 速率限制 | ✅ 合规 | 多级速率限制 |
| CORS 配置 | ⚠️ 部分合规 | 开发环境过于宽松 |
| 错误处理体系 | ✅ 合规 | AppError 类体系 |
| 日志记录 | ✅ 合规 | 分级分类日志 |
| 代码格式化 | ❌ 不合规 | 无 ESLint/Prettier |
| 自动化测试 | ❌ 不合规 | 无测试 |
| CI/CD | ❌ 不合规 | 无 pipeline |
| API 文档 | ❌ 不合规 | 无 OpenAPI/Swagger |
| Docker 容器化 | ✅ 基本合规 | 多阶段构建 + 健康检查 |
| 12-Factor App | ⚠️ 部分合规 | 配置通过环境变量但无严格校验 |

---

## 工时汇总

| 优先级 | 总工时 | 任务数 |
|--------|--------|--------|
| 🔴 P0 | 7.5h | 5 |
| 🟡 P1 | 39h | 7 |
| 🟢 P2 | 38h | 7 |
| 🔵 P3 | 待评估 | 6 |

> 建议执行顺序: **P0（1-2 天） -> P1-1 + P1-2 + P1-6（首周打基础） -> 其余 P1/P2 按优先级推进**
</parameter>