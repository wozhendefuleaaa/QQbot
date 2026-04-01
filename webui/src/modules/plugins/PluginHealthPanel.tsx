import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Activity, RefreshCw, ShieldCheck, ShieldOff, Wrench } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/help-tooltip';
import { api, fmtTime } from '../../services/api';
import type { PluginHealthOverview, PluginHealthEntry } from '../../types';

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return '刚刚启动';

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}天 ${hours}小时`;
  if (hours > 0) return `${hours}小时 ${minutes}分钟`;
  if (minutes > 0) return `${minutes}分钟`;
  return `${totalSeconds}秒`;
}

function getStatusMeta(status: PluginHealthEntry['status']) {
  switch (status) {
    case 'healthy':
      return {
        label: '健康',
        className: 'text-green-600 border-green-500',
      };
    case 'error':
      return {
        label: '异常',
        className: 'text-red-600 border-red-500',
      };
    case 'disabled':
      return {
        label: '已禁用',
        className: 'text-gray-500 border-gray-400',
      };
    default:
      return {
        label: status,
        className: 'text-gray-500 border-gray-400',
      };
  }
}

export function PluginHealthPanel() {
  const [data, setData] = useState<PluginHealthOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [resettingId, setResettingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api<PluginHealthOverview>('/api/plugins/health');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载插件健康状态失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const filteredPlugins = useMemo(() => {
    if (!data) return [];
    const query = keyword.trim().toLowerCase();
    if (!query) return data.plugins;

    return data.plugins.filter((plugin) => {
      return (
        plugin.name.toLowerCase().includes(query) ||
        plugin.id.toLowerCase().includes(query) ||
        plugin.version.toLowerCase().includes(query)
      );
    });
  }, [data, keyword]);

  const handleReset = async (pluginId: string) => {
    try {
      setResettingId(pluginId);
      await api(`/api/plugins/${pluginId}/health`, { method: 'DELETE' });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置健康统计失败');
    } finally {
      setResettingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>插件健康监控</CardTitle>
            <CardDescription>正在加载插件运行状态...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            插件健康监控加载失败
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            重新加载
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">插件总数</p>
                <p className="text-2xl font-bold">{data.total}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已加载</p>
                <p className="text-2xl font-bold text-green-600">{data.loaded}</p>
              </div>
              <ShieldCheck className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">异常插件</p>
                <p className="text-2xl font-bold text-red-600">{data.errored}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已禁用</p>
                <p className="text-2xl font-bold text-gray-600">{data.disabled}</p>
              </div>
              <ShieldOff className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div>
              <CardTitle>插件健康详情</CardTitle>
              <CardDescription>查看插件活跃度、错误次数、运行时长与最近活动时间</CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索插件名称 / ID / 版本"
                className="w-full md:w-64"
              />
              <Button onClick={fetchData} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPlugins.length === 0 ? (
            <EmptyState
              icon="🩺"
              title="没有匹配的健康数据"
              description="尝试修改搜索关键词，或等待插件开始运行后再查看。"
            />
          ) : (
            <div className="space-y-3">
              {filteredPlugins.map((plugin) => {
                const statusMeta = getStatusMeta(plugin.status);
                return (
                  <div
                    key={plugin.id}
                    className="rounded-lg border p-4 space-y-4 bg-card"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold">{plugin.name}</h3>
                          <Badge variant="outline" className={statusMeta.className}>
                            {statusMeta.label}
                          </Badge>
                          <Badge variant="secondary">v{plugin.version}</Badge>
                          {!plugin.enabled && <Badge variant="outline">未启用</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground break-all">ID: {plugin.id}</p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReset(plugin.id)}
                        disabled={resettingId === plugin.id}
                      >
                        <Wrench className="w-4 h-4 mr-2" />
                        {resettingId === plugin.id ? '重置中...' : '重置统计'}
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 text-sm">
                      <div className="rounded-md bg-muted/50 p-3">
                        <div className="text-muted-foreground">命令数</div>
                        <div className="mt-1 text-lg font-semibold">{plugin.commandCount}</div>
                      </div>
                      <div className="rounded-md bg-muted/50 p-3">
                        <div className="text-muted-foreground">消息处理</div>
                        <div className="mt-1 text-lg font-semibold">{plugin.messageCount}</div>
                      </div>
                      <div className="rounded-md bg-muted/50 p-3">
                        <div className="text-muted-foreground">错误次数</div>
                        <div className="mt-1 text-lg font-semibold text-red-600">{plugin.errorCount}</div>
                      </div>
                      <div className="rounded-md bg-muted/50 p-3">
                        <div className="text-muted-foreground">运行时长</div>
                        <div className="mt-1 text-lg font-semibold">{formatDuration(plugin.uptime)}</div>
                      </div>
                      <div className="rounded-md bg-muted/50 p-3">
                        <div className="text-muted-foreground">加载时间</div>
                        <div className="mt-1 font-medium">{fmtTime(plugin.loadedAt)}</div>
                      </div>
                      <div className="rounded-md bg-muted/50 p-3">
                        <div className="text-muted-foreground">最近活跃</div>
                        <div className="mt-1 font-medium">{fmtTime(plugin.lastActiveAt)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
