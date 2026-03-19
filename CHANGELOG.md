# 更新日志 (Changelog)

## [1.7.0] - 2026-03-19

### 新增功能

#### 🚀 一键部署脚本（零基础用户友好）

- 新增 [`deploy.sh`](deploy.sh) 一键部署脚本
  - **交互式菜单界面**：直接运行 `./deploy.sh` 显示可视化菜单
  - **配置向导**：引导用户填写 QQ 机器人 AppID、ClientSecret 等参数
  - **一键部署**：自动检查依赖、安装依赖、初始化配置
  - **服务管理**：一键启动/停止服务，查看服务状态
  - 支持本地开发部署 (`./deploy.sh local`)
  - 支持 Docker 容器化部署 (`./deploy.sh docker`)
  - 支持生产构建 (`./deploy.sh build`)
  - 自动检查系统依赖（Node.js、npm、Docker）
  - 自动生成安全的 JWT 密钥
  - 自动备份现有配置文件
  - 彩色终端输出，全中文提示
  - 支持 macOS 和 Linux

## [1.6.0] - 2026-03-18

### 新增功能

#### 🔐 认证安全增强

- 新增默认密码强制修改功能
  - 首次使用默认密码 `admin123` 登录后强制要求修改密码
  - 新增 [`ChangePasswordDialog.tsx`](webui/src/modules/auth/ChangePasswordDialog.tsx) 强制修改密码对话框组件
  - 后端新增 `requirePasswordChange` 用户属性标记
  - 登录时检测是否使用默认密码，返回强制修改密码标识

- 新增环境变量配置支持
  - `ADMIN_PASSWORD` - 自定义管理员初始密码（默认 `admin123`）
  - `DATA_DIR` - 自定义数据存储目录（默认 `./data`）
  - 更新 [`.env.example`](.env.example) 添加新环境变量说明

#### 🔧 后端改进

- 修改 [`auth.ts`](backend/src/core/auth.ts) 认证模块
  - 新增 `isUsingDefaultPassword()` 函数检测默认密码
  - 新增 `clearRequirePasswordChange()` 函数清除密码修改标记
  - 初始化管理员账户时设置 `requirePasswordChange: true`

- 修改 [`routes.ts`](backend/src/modules/auth/routes.ts) 认证路由
  - 登录接口返回 `requirePasswordChange` 标识
  - 修改密码成功后自动清除强制修改标记

#### 🎨 前端改进

- 修改 [`AuthContext.tsx`](webui/src/contexts/AuthContext.tsx) 认证上下文
  - 新增 `requirePasswordChange` 状态管理
  - 新增 `clearRequirePasswordChange()` 方法

- 修改 [`App.tsx`](webui/src/App.tsx) 主应用
  - 集成强制修改密码对话框
  - 登录后检测 `requirePasswordChange` 状态显示对话框

## [1.5.0] - 2026-03-18

### 新增功能

#### 🔌 OpenAPI 模块优化

- 重构 [`OpenApiPanel.tsx`](webui/src/modules/openapi/OpenApiPanel.tsx) 开放 API 管理面板
  - 新增标签页导航：Token 管理、API 文档、使用示例
  - 新增 Token 删除功能（带确认对话框）
  - 新增 Token 复制功能（一键复制到剪贴板）
  - 新增 API 文档展示（9 个接口详细说明）
  - 新增代码示例（cURL、JavaScript、Python）
  - 新增安全提示说明

- 新增 [`useDeleteOpenApiToken`](webui/src/hooks/useApi.ts:305) Hook
  - 支持删除 OpenAPI Token

- 新增 [`deleteOpenApiToken`](webui/src/App.tsx:449) 函数
  - 在 App 组件中添加删除 Token 的处理逻辑

### API 文档

新增以下接口的完整文档：
- `GET /api/external/status` - 获取机器人连接状态
- `POST /api/external/connect` - 连接机器人账号
- `POST /api/external/disconnect` - 断开机器人连接
- `POST /api/external/send` - 发送消息
- `GET /api/external/conversations` - 获取会话列表
- `GET /api/external/conversations/:id/messages` - 获取会话消息
- `GET /api/external/accounts` - 获取账号列表
- `GET /api/external/logs` - 获取平台日志
- `GET /api/external/statistics` - 获取统计信息

## [1.4.0] - 2026-03-18

### 新增功能

#### 📱 移动端 UI 全面重构

- 新增 [`MobileLayout.tsx`](webui/src/components/ui/MobileLayout.tsx) 移动端专用布局组件
  - `MobileLayoutProvider` - 移动端状态管理上下文
  - `MobileMain` / `MobileDetail` - 双视图容器组件
  - `MobilePage` / `MobileCard` / `MobileListItem` - 移动端内容组件
  - `MobileSegmentedControl` - 分段控制器
  - `MobileEmpty` / `MobileBottomSheet` - 辅助组件

- 重构 [`ChatPanel.tsx`](webui/src/modules/chat/ChatPanel.tsx) 为双视图模式
  - 移动端采用列表/详情分离的双视图模式
  - 点击会话进入聊天详情页（带滑入动画）
  - 支持从左边缘滑动返回会话列表
  - 桌面端保持原有三栏布局不变

- 新增 [`useSwipe.ts`](webui/src/hooks/useSwipe.ts) 手势交互 Hook
  - `useSwipe` - 通用滑动手势检测
  - `useSwipeBack` - 边缘滑动返回（支持进度跟踪）
  - `useSwipeDelete` - 滑动删除
  - `usePullToRefresh` - 下拉刷新

- 增强 [`sidebar.tsx`](webui/src/components/ui/sidebar.tsx) 移动端组件
  - `MobileNav` 支持徽章显示和可见性动画
  - `MobileHeader` 支持返回按钮、副标题、右侧内容插槽

- 更新 [`styles.css`](webui/src/styles.css) 移动端专用样式
  - 安全区域适配（safe-area-inset-top/bottom）
  - 视图切换动画（slide-in-right、slide-out-right 等）
  - 移动端导航栏和头部样式
  - 移动端卡片、列表、表单元素样式
  - 深色主题移动端适配

- 优化各面板移动端响应式布局
  - [`HomePage.tsx`](webui/src/modules/home/HomePage.tsx) - 统计卡片网格适配、文字大小响应式
  - [`AccountsPanel.tsx`](webui/src/modules/accounts/AccountsPanel.tsx) - 表单布局堆叠、按钮全宽
  - [`ConversationList.tsx`](webui/src/modules/chat/ConversationList.tsx) - 添加 mobileMode 属性
  - [`MessagePanel.tsx`](webui/src/modules/chat/MessagePanel.tsx) - 添加 mobileMode 属性

### 技术细节
- 使用 CSS `transform` 实现流畅的视图切换动画
- 使用 `touchstart/touchmove/touchend` 实现原生般的手势交互
- 使用 `env(safe-area-inset-*)` 适配 iOS 刘海屏和底部指示条
- 使用 `pointer-events-none` 防止隐藏视图接收触摸事件

## [1.3.0] - 2026-03-17

### 新增功能

#### 📱 移动端 UI 重设计
- 新增 [`MobileNav`](webui/src/components/ui/sidebar.tsx) 移动端底部导航组件
  - 5个主要导航项：首页、聊天、平台、插件、更多
  - 支持触摸优化的 44px 最小点击区域
  - 支持 iOS 安全区域适配（safe-area-inset）

- 新增 [`MobileHeader`](webui/src/components/ui/sidebar.tsx) 移动端顶部标题栏
  - 显示应用名称和平台连接状态
  - 集成用户信息和登出按钮
  - 响应式隐藏（桌面端显示原有 header）

- 更新 [`App.tsx`](webui/src/App.tsx) 响应式布局
  - 桌面端（md 断点以上）：显示侧边栏导航
  - 移动端：显示底部导航栏 + 顶部标题栏
  - 新增"更多"弹出菜单，包含次要功能入口

- 更新 [`globals.css`](webui/src/globals.css) 移动端样式
  - 添加 `safe-area-inset-bottom` CSS 类
  - 添加 `mobile-nav` 底部导航样式
  - 添加 `slide-up` 动画用于弹出菜单
  - 移动端触摸优化（最小点击区域、防止 iOS 缩放）

### 技术细节
- 使用 Tailwind CSS `md:` 断点实现响应式切换
- 使用 `env(safe-area-inset-bottom)` 适配 iOS 刘海屏
- 使用 `backdrop-filter: blur()` 实现毛玻璃效果

## [1.2.0] - 2026-03-17

### 新增功能

#### 🔌 云崽插件适配器
- 新增 [`yunzai-adapter.ts`](backend/src/core/yunzai-adapter.ts) 云崽插件适配层
  - 实现 `segment` 消息构建器，支持 text、image、at、reply、face 等消息类型
  - 实现 `YunzaiPlugin` 基类适配，支持云崽插件格式
  - 实现 `YunzaiEvent` 事件对象，模拟云崽事件接口
  - 实现三权限等级系统：master（主人）> admin（管理员）> all（所有人）
  - 实现 `Bot` 对象模拟，支持发送消息、获取群成员列表等操作
  - 支持全局对象注入：`global.segment`、`global.Bot`、`global.logger`

- 扩展 [`plugin-manager.ts`](backend/src/core/plugin-manager.ts) 插件管理器
  - 自动检测并加载云崽格式插件
  - 支持单文件插件（.js/.mjs/.ts）
  - 支持插件包目录（含 `apps/` 子目录）
  - 自动转换云崽插件规则为原生插件命令

- 新增 [`YUNZAI_ADAPTER.md`](backend/src/plugins/YUNZAI_ADAPTER.md) 适配器文档
  - 详细说明插件格式支持
  - 提供事件对象 API 参考
  - 提供权限配置方式
  - 提供插件示例和迁移指南

#### 🎛️ WebUI 权限配置
- 新增云崽权限配置界面到 [`ConfigPanel.tsx`](webui/src/modules/config/ConfigPanel.tsx)
  - 支持在配置页面添加/删除主人（👑 最高权限）
  - 支持在配置页面添加/删除管理员（🛡️ 次级权限）
  - 实时显示当前权限列表

- 新增后端 API 路由到 [`config/routes.ts`](backend/src/modules/config/routes.ts)
  - `GET /api/config/yunzai-permission` - 获取权限配置
  - `POST /api/config/yunzai-permission` - 更新权限配置
  - `POST /api/config/yunzai-permission/master` - 添加主人
  - `DELETE /api/config/yunzai-permission/master/:userId` - 删除主人
  - `POST /api/config/yunzai-permission/admin` - 添加管理员
  - `DELETE /api/config/yunzai-permission/admin/:userId` - 删除管理员

- 新增前端类型定义和 API hooks
  - `YunzaiPermissionConfig` 类型定义
  - `useYunzaiPermission` - 获取权限配置
  - `useAddYunzaiMaster` / `useRemoveYunzaiMaster` - 主人管理
  - `useAddYunzaiAdmin` / `useRemoveYunzaiAdmin` - 管理员管理

### 技术细节
- 权限配置持久化存储到 `app-config.json`
- 支持环境变量回退：`YUNZAI_MASTER_ID`、`YUNZAI_ADMIN_ID`
- WebUI 使用 React Query 实现数据缓存和自动刷新

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
