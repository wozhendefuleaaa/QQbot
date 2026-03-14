import { useState } from 'react';
import { PluginInfo, PluginConfig } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package, Upload, Plus } from 'lucide-react';
import { PluginStats } from './PluginStats';
import { PluginToolbar } from './PluginToolbar';
import { PluginCard } from './PluginCard';
import { PluginDetailDialog } from './PluginDetailDialog';
import { PluginConfigDialog } from './PluginConfigDialog';
import { PluginUploadDialog } from './PluginUploadDialog';
import { PluginCodeEditor } from './PluginCodeEditor';
import { Button } from '@/components/ui/button';

type Props = {
  plugins: PluginInfo[];
  pluginConfig: PluginConfig | null;
  onTogglePlugin: (id: string) => void;
  onReloadPlugin: (id: string) => Promise<void>;
  onDeletePlugin: (id: string) => Promise<void>;
  onUpdateConfig: (config: Partial<PluginConfig>) => Promise<void>;
  onUploadPlugin: (filename: string, content: string) => Promise<void>;
  onLoadPluginSource: (id: string) => Promise<{ source: string; filename: string }>;
  onSavePluginSource: (id: string, content: string) => Promise<void>;
};

// 新建插件模板
const NEW_PLUGIN_TEMPLATE = `import { Plugin, PluginContext, MessageEvent, CommandDefinition } from '../core/plugin-types';

export default {
  name: 'my-plugin',
  version: '1.0.0',
  description: '我的新插件',
  author: '作者名称',

  // 插件加载时调用
  onLoad: async (ctx: PluginContext) => {
    ctx.logger.info('插件已加载');
  },

  // 插件卸载时调用
  onUnload: async (ctx: PluginContext) => {
    ctx.logger.info('插件已卸载');
  },

  // 消息处理
  onMessage: async (event: MessageEvent, ctx: PluginContext) => {
    // 处理消息逻辑
    // 返回 true 可以阻止后续插件处理
    return false;
  },

  // 命令定义
  commands: [
    {
      name: 'hello',
      description: '打招呼',
      usage: '/hello',
      permission: 'public',
      handler: async (args, event, ctx) => {
        return '你好！';
      },
    },
  ] as CommandDefinition[],
} as Plugin;
`;

export function PluginsPanel({
  plugins,
  pluginConfig,
  onTogglePlugin,
  onReloadPlugin,
  onDeletePlugin,
  onUpdateConfig,
  onUploadPlugin,
  onLoadPluginSource,
  onSavePluginSource,
}: Props) {
  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
  
  // UI 状态
  const [selectedPlugin, setSelectedPlugin] = useState<PluginInfo | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [expandedPlugins, setExpandedPlugins] = useState<Set<string>>(new Set());
  const [reloading, setReloading] = useState<string | null>(null);
  
  // 上传对话框状态
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFilename, setUploadFilename] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // 代码编辑器状态
  const [showEditorDialog, setShowEditorDialog] = useState(false);
  const [editorPlugin, setEditorPlugin] = useState<PluginInfo | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [editorFilename, setEditorFilename] = useState('');
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);

  // 筛选插件
  const filteredPlugins = plugins.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'enabled' && p.enabled) ||
      (filterStatus === 'disabled' && !p.enabled);
    return matchesSearch && matchesStatus;
  });

  // 统计信息
  const stats = {
    total: plugins.length,
    enabled: plugins.filter((p) => p.enabled).length,
    loaded: plugins.filter((p) => p.loaded).length,
  };

  // 切换展开状态
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedPlugins);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedPlugins(newExpanded);
  };

  // 处理重载
  const handleReload = async (id: string) => {
    setReloading(id);
    try {
      await onReloadPlugin(id);
    } finally {
      setReloading(null);
    }
  };

  // 打开编辑器（编辑现有插件）
  const openEditor = async (plugin: PluginInfo) => {
    setEditorPlugin(plugin);
    setEditorLoading(true);
    setShowEditorDialog(true);
    try {
      const result = await onLoadPluginSource(plugin.id);
      setEditorContent(result.source);
      setEditorFilename(result.filename);
    } catch (error) {
      console.error('加载插件源码失败:', error);
      setEditorContent('// 无法加载插件源码');
      setEditorFilename('');
    } finally {
      setEditorLoading(false);
    }
  };

  // 创建新插件
  const createNewPlugin = () => {
    setEditorPlugin(null);
    setEditorContent(NEW_PLUGIN_TEMPLATE);
    setEditorFilename('my-plugin.ts');
    setShowEditorDialog(true);
  };

  // 保存插件源码
  const handleSaveSource = async () => {
    setEditorSaving(true);
    try {
      if (editorPlugin) {
        // 更新现有插件
        await onSavePluginSource(editorPlugin.id, editorContent);
      } else {
        // 创建新插件
        await onUploadPlugin(editorFilename, editorContent);
      }
      setShowEditorDialog(false);
      setEditorPlugin(null);
    } catch (error) {
      console.error('保存插件源码失败:', error);
    } finally {
      setEditorSaving(false);
    }
  };

  // 处理上传
  const handleUpload = async () => {
    if (!uploadFilename || !uploadContent) return;
    setUploading(true);
    try {
      await onUploadPlugin(uploadFilename, uploadContent);
      setShowUploadDialog(false);
      setUploadFilename('');
      setUploadContent('');
    } catch (error) {
      console.error('上传插件失败:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* 统计卡片 */}
      <PluginStats total={stats.total} enabled={stats.enabled} loaded={stats.loaded} />

      {/* 工具栏 */}
      <PluginToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        onOpenConfig={() => setShowConfig(true)}
        onOpenUpload={() => setShowUploadDialog(true)}
        onCreateNew={createNewPlugin}
      />

      {/* 插件列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">插件列表</CardTitle>
          <CardDescription>
            管理已安装的插件（共 {filteredPlugins.length} 个
            {searchQuery || filterStatus !== 'all' ? `，筛选自 ${plugins.length} 个` : ''}）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPlugins.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">
                {plugins.length === 0 ? '暂无插件，点击上方按钮创建或上传插件' : '没有匹配的插件'}
              </p>
              {plugins.length === 0 && (
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => setShowUploadDialog(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    上传插件
                  </Button>
                  <Button onClick={createNewPlugin}>
                    <Plus className="w-4 h-4 mr-2" />
                    新建插件
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPlugins.map((p) => (
                <PluginCard
                  key={p.id}
                  plugin={p}
                  isExpanded={expandedPlugins.has(p.id)}
                  isReloading={reloading === p.id}
                  onToggleExpand={() => toggleExpand(p.id)}
                  onToggle={() => onTogglePlugin(p.id)}
                  onReload={() => handleReload(p.id)}
                  onEdit={() => openEditor(p)}
                  onShowDetail={() => setSelectedPlugin(p)}
                  onDelete={() => onDeletePlugin(p.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 插件详情对话框 */}
      <PluginDetailDialog
        plugin={selectedPlugin}
        open={selectedPlugin !== null}
        onOpenChange={(open) => !open && setSelectedPlugin(null)}
        onDelete={onDeletePlugin}
      />

      {/* 插件配置对话框 */}
      <PluginConfigDialog
        config={pluginConfig}
        open={showConfig}
        onOpenChange={setShowConfig}
        onUpdateConfig={onUpdateConfig}
      />

      {/* 上传插件对话框 */}
      <PluginUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        filename={uploadFilename}
        onFilenameChange={setUploadFilename}
        content={uploadContent}
        onContentChange={setUploadContent}
        uploading={uploading}
        onUpload={handleUpload}
      />

      {/* 代码编辑器对话框 */}
      <PluginCodeEditor
        plugin={editorPlugin}
        open={showEditorDialog}
        onOpenChange={setShowEditorDialog}
        filename={editorFilename}
        content={editorContent}
        onContentChange={setEditorContent}
        loading={editorLoading}
        saving={editorSaving}
        onSave={handleSaveSource}
      />
    </div>
  );
}
