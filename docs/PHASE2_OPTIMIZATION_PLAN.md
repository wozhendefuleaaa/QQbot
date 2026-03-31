# 插件市场优化方案 - 第二阶段：体验优化

## 概述

第二阶段专注于提升用户体验，包括统计图表展示、日志查看、元数据管理等功能的实现。

## 功能模块

### 1. 统计图表模块

#### 1.1 市场统计 API
```typescript
// GET /api/plugins/market/stats
{
  totalPlugins: number;         // 总插件数
  totalDownloads: number;       // 总下载量
  totalInstalls: number;        // 本地安装数
  categories: {                 // 分类统计
    [category: string]: number;
  };
  recentInstalls: {             // 最近安装记录
    pluginId: string;
    pluginName: string;
    installedAt: string;
  }[];
  popularPlugins: {             // 热门插件 Top 5
    id: string;
    name: string;
    downloads: number;
  }[];
}
```

#### 1.2 前端统计面板
- **位置**: 插件市场顶部展示区
- **内容**:
  - 总插件数/已安装数徽章
  - 分类饼图（使用 recharts）
  - 热门插件排行榜
  - 最近安装记录时间线

### 2. 安装日志模块

#### 2.1 后端安装日志
```typescript
// 存储在 data/install-logs.json
interface InstallLog {
  id: string;
  pluginId: string;
  pluginName: string;
  status: 'success' | 'failed';
  message: string;
  duration: number;          // 安装耗时（毫秒）
  timestamp: string;
  error?: string;
}
```

#### 2.2 安装日志 API
```typescript
// GET /api/plugins/market/logs
{
  success: true;
  data: {
    items: InstallLog[];
    total: number;
  };
}

// DELETE /api/plugins/market/logs
// 清空安装日志
```

#### 2.3 前端日志面板
- **位置**: 插件页面底部可折叠区域
- **功能**:
  - 安装历史记录列表
  - 成功/失败状态标识
  - 错误详情展开
  - 清空日志按钮

### 3. 插件元数据增强

#### 3.1 扩展元数据字段
```typescript
interface PluginMeta {
  // 现有字段
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  
  // 新增字段
  readme?: string;           // README 内容（Markdown）
  changelog?: string;        // 更新日志
  license?: string;          // 许可证
  homepage?: string;         // 主页
  bugs?: string;             // 问题反馈
  dependencies?: string[];   // 依赖列表
  keywords?: string[];       // 关键词
  screenshots?: string[];    // 截图URL
  compatibility?: {          // 兼容性
    node?: string;           // Node.js 版本要求
    yunzai?: boolean;        // 云崽兼容
  };
  installedAt?: string;      // 安装时间
  installedVersion?: string; // 已安装版本
  updateAvailable?: boolean; // 有可用更新
}
```

#### 3.2 插件详情对话框
- **触发**: 点击插件卡片或查看详情按钮
- **内容**:
  - 基本信息（名称、作者、版本、描述）
  - README 渲染（Markdown）
  - 更新日志
  - 依赖列表
  - 兼容性信息
  - 截图预览（如有）
  - 安装/卸载/更新操作按钮

### 4. 更新检测增强

#### 4.1 版本比较 API
```typescript
// GET /api/plugins/market/check-updates
{
  success: true;
  data: {
    hasUpdates: boolean;
    updates: {
      pluginId: string;
      currentVersion: string;
      latestVersion: string;
      changelog?: string;
    }[];
  };
}
```

#### 4.2 前端更新提示
- 插件列表中显示更新徽章
- 一键更新所有插件按钮
- 更新进度展示

## 实现步骤

### 步骤 1: 后端统计 API (30分钟)
1. 创建 `/api/plugins/market/stats` 路由
2. 实现统计数据聚合逻辑
3. 添加安装记录存储

### 步骤 2: 安装日志系统 (30分钟)
1. 创建安装日志存储模块
2. 添加日志 API 路由
3. 集成到安装流程

### 步骤 3: 前端统计面板 (45分钟)
1. 安装 recharts 依赖
2. 创建统计图表组件
3. 集成到市场页面

### 步骤 4: 插件详情对话框 (45分钟)
1. 创建详情对话框组件
2. 实现 Markdown 渲染
3. 添加元数据展示

### 步骤 5: 更新检测 UI (30分钟)
1. 添加更新徽章组件
2. 实现一键更新功能
3. 优化更新进度展示

## 文件结构

```
backend/src/modules/market/
├── routes.ts              # 现有路由（扩展）
├── stats.ts               # 新增：统计模块
└── install-logs.ts        # 新增：安装日志模块

webui/src/modules/plugins/
├── PluginMarketTab.tsx    # 现有组件（扩展）
├── PluginMarketCard.tsx   # 现有组件（扩展）
├── PluginDetailDialog.tsx # 新增：插件详情对话框
├── MarketStatsPanel.tsx   # 新增：统计面板
└── InstallLogPanel.tsx    # 新增：安装日志面板

webui/src/types/
└── market.ts              # 扩展类型定义
```

## 依赖项

### 新增前端依赖
```json
{
  "recharts": "^2.10.0",
  "react-markdown": "^9.0.0"
}
```

## 预估时间
- 总计: 约 3 小时
- 后端: 1 小时
- 前端: 2 小时

## 优先级建议

1. **高优先级** (必做)
   - 统计 API 和基础统计展示
   - 安装日志记录和查看
   - 插件详情对话框

2. **中优先级** (推荐)
   - 图表可视化
   - 更新检测 UI

3. **低优先级** (可选)
   - 截图预览
   - 高级筛选

## 下一步

确认方案后，我将按以下顺序开始实现：

1. 后端统计 API
2. 安装日志系统
3. 前端统计面板
4. 插件详情对话框
5. 更新检测 UI
