# 更新日志 (Changelog)

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
