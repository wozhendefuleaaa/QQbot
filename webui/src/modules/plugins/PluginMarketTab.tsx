import { useState, useEffect, useCallback } from 'react';
import { MarketPlugin, InstallProgress, PluginUpdate } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  RefreshCw,
  Store,
  GitBranch,
  CheckCircle2,
  Loader2,
  BarChart3,
  ArrowUp,
} from 'lucide-react';
import { PluginMarketCard } from './PluginMarketCard';
import { PluginInstallDialog } from './PluginInstallDialog';
import { MarketPluginDetailDialog } from './PluginDetailDialog';
import { QuickTips, EmptyState } from '@/components/ui/help-tooltip';
import { MarketStatsPanel } from './MarketStatsPanel';
import { UpdateIndicator } from './UpdateIndicator';

type Props = {
  installedPluginIds: string[];
  onInstallComplete: () => void;
};

// 分类配置
const CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'chat', label: '聊天' },
  { id: 'tool', label: '工具' },
  { id: 'game', label: '游戏' },
  { id: 'ai', label: 'AI' },
  { id: 'media', label: '媒体' },
  { id: 'admin', label: '管理' },
  { id: 'other', label: '其他' },
];

export function PluginMarketTab({ installedPluginIds, onInstallComplete }: Props) {
  // 市场数据状态
  const [plugins, setPlugins] = useState<MarketPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showYunzaiOnly, setShowYunzaiOnly] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);

  // 安装状态
  const [installingPlugin, setInstallingPlugin] = useState<MarketPlugin | null>(null);
  const [installProgress, setInstallProgress] = useState<InstallProgress | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);

  // 详情对话框状态
  const [detailPlugin, setDetailPlugin] = useState<MarketPlugin | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // 更新检测状态
  const [availableUpdates, setAvailableUpdates] = useState<PluginUpdate[]>([]);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updatingPluginId, setUpdatingPluginId] = useState<string | null>(null);

  // 获取市场插件列表
  const fetchMarketPlugins = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const url = forceRefresh
        ? '/api/plugins/market/list?refresh=true'
        : '/api/plugins/market/list';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('获取插件市场数据失败');
      }

      const data = await response.json();
      // 后端返回 { success: true, data: { plugins: [...] } }
      setPlugins(data.data?.plugins || data.plugins || []);
    } catch (err) {
      console.error('获取市场插件失败:', err);
      setError(err instanceof Error ? err.message : '获取插件市场数据失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketPlugins();
  }, [fetchMarketPlugins]);

  // 轮询安装进度
  useEffect(() => {
    if (!installingPlugin || !showInstallDialog) return;

    // 如果已经完成或失败，停止轮询
    if (installProgress && (installProgress.status === 'completed' || installProgress.status === 'failed')) {
      return;
    }

    const pollProgress = async () => {
      try {
        const response = await fetch(`/api/plugins/market/install/progress/${installingPlugin.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // 只有当 data.data 存在时才更新进度（后端返回 {success: true, data: null} 表示还没有进度）
          const progress = data.data;
          if (progress) {
            setInstallProgress(progress);

            if (progress.status === 'completed' || progress.status === 'failed') {
              if (progress.status === 'completed') {
                setTimeout(() => {
                  setShowInstallDialog(false);
                  setInstallingPlugin(null);
                  setInstallProgress(null);
                  onInstallComplete();
                  fetchMarketPlugins();
                }, 1500);
              }
            }
          }
        }
      } catch (err) {
        console.error('获取安装进度失败:', err);
      }
    };

    // 轮询间隔改为 1000ms，避免触发 rate limiter
    const interval = setInterval(pollProgress, 1000);
    return () => clearInterval(interval);
  }, [installingPlugin, showInstallDialog, installProgress, onInstallComplete, fetchMarketPlugins]);

  // 开始安装插件
  const handleInstall = async (plugin: MarketPlugin) => {
    setInstallingPlugin(plugin);
    setInstallProgress({
      pluginId: plugin.id,
      status: 'downloading',
      progress: 0,
      message: '准备下载...',
    });
    setShowInstallDialog(true);

    try {
      const response = await fetch('/api/plugins/market/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          pluginId: plugin.id,
          downloadUrl: plugin.downloadUrl
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '安装失败');
      }
    } catch (err) {
      console.error('安装插件失败:', err);
      setInstallProgress({
        pluginId: plugin.id,
        status: 'failed',
        progress: 0,
        message: '安装失败',
        error: err instanceof Error ? err.message : '安装失败',
      });
    }
  };

  // 筛选插件
  const filteredPlugins = plugins.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    const matchesYunzai = !showYunzaiOnly || p.yunzaiCompatible;

    return matchesSearch && matchesCategory && matchesYunzai;
  });

  // 检测插件更新
  const checkForUpdates = useCallback(async () => {
    setCheckingUpdates(true);
    try {
      const response = await fetch('/api/plugins/market/check-updates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableUpdates(data.data || []);
      }
    } catch (err) {
      console.error('检测更新失败:', err);
    } finally {
      setCheckingUpdates(false);
    }
  }, []);

  // 更新单个插件
  const handleUpdatePlugin = useCallback(async (pluginId: string) => {
    // 找到市场中的插件信息
    const marketPlugin = plugins.find(p => p.id === pluginId);
    if (!marketPlugin) return;
    
    setUpdatingPluginId(pluginId);
    
    // 使用安装流程来更新插件
    await handleInstall(marketPlugin);
    
    // 安装完成后清除更新状态
    setTimeout(() => {
      setAvailableUpdates(prev => prev.filter(u => u.id !== pluginId));
      setUpdatingPluginId(null);
      onInstallComplete();
    }, 2000);
  }, [plugins, handleInstall, onInstallComplete]);

  // 获取插件的更新信息
  const getPluginUpdate = useCallback((pluginId: string) => {
    return availableUpdates.find(u => u.id === pluginId);
  }, [availableUpdates]);

  // 统计信息
  const stats = {
    total: plugins.length,
    installed: plugins.filter((p) => installedPluginIds.includes(p.id)).length,
    yunzaiCompatible: plugins.filter((p) => p.yunzaiCompatible).length,
  };

  return (
    <div className="space-y-6">
      {/* 新手引导 */}
      {plugins.length === 0 && !loading && !error && (
        <QuickTips
          tips={[
            '插件市场提供丰富的社区插件，可以一键安装',
            '支持搜索、分类筛选，快速找到需要的插件',
            '云崽兼容插件可以直接使用现有的云崽插件生态',
            '安装后记得启用插件才能生效',
          ]}
          title="🏪 插件市场指南"
        />
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Store className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">可用插件</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.installed}</p>
                <p className="text-sm text-muted-foreground">已安装</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <GitBranch className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.yunzaiCompatible}</p>
                <p className="text-sm text-muted-foreground">云崽兼容</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索插件名称、描述、作者或标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchMarketPlugins(true)}
              disabled={refreshing}
              title="刷新市场数据"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.id}
                variant={categoryFilter === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button
              variant={showYunzaiOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowYunzaiOnly(!showYunzaiOnly)}
            >
              <GitBranch className="w-4 h-4 mr-1" />
              仅云崽兼容
            </Button>
            <Button
              variant={showStatsPanel ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowStatsPanel(!showStatsPanel)}
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              统计面板
            </Button>
            <UpdateIndicator
              updates={availableUpdates}
              checking={checkingUpdates}
              onCheckUpdates={checkForUpdates}
            />
          </div>

          {/* 显示可用的更新列表 */}
          {availableUpdates.length > 0 && (
            <Card className="mt-4 border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowUp className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-orange-700 dark:text-orange-400">
                    有 {availableUpdates.length} 个插件可更新
                  </span>
                </div>
                <div className="space-y-2">
                  {availableUpdates.map((update) => (
                    <div
                      key={update.id}
                      className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border"
                    >
                      <div>
                        <span className="font-medium text-sm">{update.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {update.currentVersion} → {update.latestVersion}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleUpdatePlugin(update.id)}
                        disabled={updatingPluginId === update.id}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        {updatingPluginId === update.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowUp className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* 统计面板 */}
      {showStatsPanel && <MarketStatsPanel />}

      {/* 错误提示 */}
      {error && (
        <Card className="border-red-500/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-500">
              <span>❌</span>
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={() => fetchMarketPlugins()}>
                重试
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">加载插件市场...</span>
        </div>
      )}

      {/* 插件列表 */}
      {!loading && !error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">插件列表</CardTitle>
            <CardDescription>
              共 {filteredPlugins.length} 个插件
              {searchQuery || categoryFilter !== 'all' || showYunzaiOnly
                ? `（筛选自 ${plugins.length} 个）`
                : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredPlugins.length === 0 ? (
              plugins.length === 0 ? (
                <EmptyState
                  icon="🏪"
                  title="插件市场暂无插件"
                  description="插件市场正在建设中，敬请期待更多精彩插件！"
                />
              ) : (
                <EmptyState
                  icon="🔍"
                  title="没有找到匹配的插件"
                  description="尝试修改搜索关键词或筛选条件"
                />
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlugins.map((plugin) => (
                  <PluginMarketCard
                    key={plugin.id}
                    plugin={plugin}
                    isInstalled={installedPluginIds.includes(plugin.id)}
                    onInstall={() => handleInstall(plugin)}
                    onViewDetails={() => {
                      setDetailPlugin(plugin);
                      setShowDetailDialog(true);
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 安装进度对话框 */}
      <PluginInstallDialog
        plugin={installingPlugin}
        progress={installProgress}
        open={showInstallDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowInstallDialog(false);
            setInstallingPlugin(null);
            setInstallProgress(null);
          }
        }}
      />

      {/* 插件详情对话框 */}
      <MarketPluginDetailDialog
        plugin={detailPlugin}
        open={showDetailDialog}
        onOpenChange={(open: boolean) => {
          setShowDetailDialog(open);
          if (!open) {
            setDetailPlugin(null);
          }
        }}
        isInstalled={detailPlugin ? installedPluginIds.includes(detailPlugin.id) : false}
        onInstall={() => {
          if (detailPlugin) {
            handleInstall(detailPlugin);
            setShowDetailDialog(false);
          }
        }}
      />
    </div>
  );
}
