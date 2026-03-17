# 更新日志 (Changelog)

## [1.1.1] - 2026-03-17

### Bug 修复

#### 🔧 External API 路由认证修复
- 修复 [`app.ts`](backend/src/core/app.ts) 中 External API 路由注册顺序问题
  - 将 `registerExternalApiRoutes` 和 `registerSseRoutes` 移至 JWT 认证中间件之前
  - External API 使用独立的 OpenAPI Token 认证机制，不应被 JWT 认证拦截
  - 修复前：使用 OpenAPI Token 访问 `/api/external/*` 会先被 JWT 认证拦截返回 401
  - 修复后：External API 路由正确使用自己的 `openApiAuth` 中间件验证 OpenAPI Token

## [1.1.0] - 2026-03-17

### 新增功能

#### ⚙️ 配置中心重构
- 重构 [`ConfigPanel.tsx`](webui/src/modules/config/ConfigPanel.tsx)
  - 使用 React Query hooks 替换直接 API 调用，优化数据缓存和状态管理
  - 添加 Toast 通知反馈（使用 sonner 库）
  - 添加删除确认对话框，防止误操作
  - 实现插件状态切换防抖（300ms），减少 API 请求
  - 完善加载状态管理（骨架屏、加载动画）
  - 添加批量操作功能（全启/全禁）
  - 改进可访问性（ARIA 属性、键盘导航）
  - 添加常量定义和类型注解

#### 🔐 后端安全增强
- 更新 [`config/routes.ts`](backend/src/modules/config/routes.ts)
  - 所有配置路由添加认证保护
  - 添加输入验证中间件
  - 添加速率限制（配置更新 10次/分钟，权限操作 30次/分钟，切换操作 100次/分钟）
  - 添加操作日志记录

#### 🎨 用户体验优化
- 新增 React Query hooks 用于插件权限矩阵操作
  - `usePluginPermissionMatrix` - 获取权限矩阵
  - `useAddGroupToMatrix` - 添加群组
  - `useRemoveGroupFromMatrix` - 删除群组
  - `useTogglePluginPermission` - 切换插件状态
  - `useBatchTogglePluginPermission` - 批量切换

### 技术细节
- 安装 sonner 库用于 Toast 通知
- 使用 TypeScript 泛型优化防抖函数类型
- 使用 useMemo 和 useCallback 优化渲染性能

## [1.0.0] - 2026-03-16

### 新增功能

#### 🎨 深浅色主题切换
- 新增主题切换组件 [`theme-toggle.tsx`](webui/src/components/ui/theme-toggle.tsx)
- 支持亮色、暗色和跟随系统三种模式
- 主题状态持久化存储到 localStorage
- 全局 CSS 变量支持主题切换

#### 🏠 主页模块
- 新增 [`HomePage.tsx`](webui/src/modules/home/HomePage.tsx) 主页组件
- 显示系统状态概览（在线账号、今日消息、启用插件、社交关系）
- 平台连接状态实时显示
- 快速操作入口卡片
- 新手引导步骤说明

#### 💬 聊天中心重新设计
- 重新设计 [`ConversationList.tsx`](webui/src/modules/chat/ConversationList.tsx)
  - 新增视图模式切换（全部/私聊/群聊）
  - 统计信息显示
  - 渐变头像样式
  - 改进的标签筛选 UI
- 重新设计 [`MessagePanel.tsx`](webui/src/modules/chat/MessagePanel.tsx)
  - 新增表情选择器
  - 改进的消息气泡样式
  - 渐变标题栏
  - 自动扩展文本输入框
  - 平台连接状态提示
- 重新设计 [`AccountNav.tsx`](webui/src/modules/chat/AccountNav.tsx)
  - 在线账号数量徽章
  - 渐变背景样式
  - 账号状态指示器
  - 空状态友好提示

#### 📝 操作小白化
- 新增 [`help-tooltip.tsx`](webui/src/components/ui/help-tooltip.tsx) 帮助组件库
  - `HelpTooltip` - 悬停帮助提示组件
  - `GuideStep` - 引导步骤组件
  - `EmptyState` - 空状态友好提示组件
  - `StatusBadge` - 状态徽章组件
  - `QuickTips` - 快速提示卡片组件
- 更新 [`AccountsPanel.tsx`](webui/src/modules/accounts/AccountsPanel.tsx)
  - 添加新手引导提示
  - 表单字段帮助提示
  - 友好的空状态显示
  - 账号状态徽章
- 更新 [`PlatformPanel.tsx`](webui/src/modules/platform/PlatformPanel.tsx)
  - 连接指南提示
  - 按钮操作提示
  - 状态字段说明
  - 日志空状态优化
- 更新 [`PluginsPanel.tsx`](webui/src/modules/plugins/PluginsPanel.tsx)
  - 插件使用指南
  - 空状态友好提示

### 优化改进
- 更新页面标题和默认配置名称
- 改进整体 UI 视觉效果
- 统一组件样式风格

### 技术细节
- 使用 Tailwind CSS 实现响应式设计
- CSS 变量支持主题切换
- 组件化设计便于维护
- TypeScript 类型安全
