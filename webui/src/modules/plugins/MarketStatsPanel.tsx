import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarketStats, InstallLog } from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { TrendingUp, Download, Package, Clock, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function MarketStatsPanel() {
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [logs, setLogs] = useState<InstallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/plugins/market/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }),
        fetch('/api/plugins/market/logs', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.data);
        }
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        if (logsData.success) {
          setLogs(logsData.data.items || []);
        }
      }
    } catch (err) {
      console.error('获取统计数据失败:', err);
      setError(err instanceof Error ? err.message : '获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const clearLogs = async () => {
    try {
      const res = await fetch('/api/plugins/market/logs', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (res.ok) {
        setLogs([]);
      }
    } catch (err) {
      console.error('清空日志失败:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">加载统计数据...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  // 准备图表数据
  const categoryData = Object.entries(stats.categories).map(([name, value]) => ({
    name,
    value,
  }));

  const popularPluginsData = stats.popularPlugins.slice(0, 5).map(p => ({
    name: p.name.length > 6 ? p.name.slice(0, 6) + '...' : p.name,
    downloads: p.downloads,
  }));

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalPlugins}</p>
                <p className="text-sm text-muted-foreground">市场插件</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalDownloads.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">总下载量</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.localInstalls}</p>
                <p className="text-sm text-muted-foreground">本地安装</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{logs.length}</p>
                <p className="text-sm text-muted-foreground">安装记录</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 分类分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">插件分类分布</CardTitle>
            <CardDescription>按类别统计插件数量</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* 热门插件 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">热门插件</CardTitle>
            <CardDescription>下载量 Top 5</CardDescription>
          </CardHeader>
          <CardContent>
            {popularPluginsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={popularPluginsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="downloads" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 安装日志 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">安装日志</CardTitle>
            <CardDescription>最近的插件安装记录</CardDescription>
          </div>
          {logs.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearLogs}>
              <Trash2 className="h-4 w-4 mr-1" />
              清空
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                      {log.status === 'success' ? '成功' : '失败'}
                    </Badge>
                    <div>
                      <p className="font-medium">{log.pluginName}</p>
                      <p className="text-sm text-muted-foreground">{log.message}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{formatDuration(log.duration)}</p>
                    <p>{formatDate(log.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              暂无安装记录
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}