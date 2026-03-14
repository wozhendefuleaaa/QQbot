import { StatisticsSnapshot } from '../../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Props = {
  snapshot: StatisticsSnapshot | null;
  onRefresh: () => void;
};

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分钟`;
  return `${Math.floor(seconds / 86400)}天${Math.floor((seconds % 86400) / 3600)}小时`;
}

export function StatisticsPanel({ snapshot, onRefresh }: Props) {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">统计中心</h2>
          <p className="text-muted-foreground">查看系统运行统计数据</p>
        </div>
        <Button variant="outline" onClick={onRefresh}>刷新统计</Button>
      </div>

      {!snapshot ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-muted-foreground text-center">暂无统计数据</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* 概览卡片 */}
          <Card>
            <CardHeader>
              <CardTitle>概览</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                  <span className="text-sm text-muted-foreground">日期</span>
                  <p className="text-xl font-semibold mt-1">{snapshot.date}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <span className="text-sm text-muted-foreground">在线账号</span>
                  <p className="text-xl font-semibold mt-1">{snapshot.activeAccounts} / {snapshot.totalAccounts}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <span className="text-sm text-muted-foreground">会话总数</span>
                  <p className="text-xl font-semibold mt-1">{snapshot.conversations}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <span className="text-sm text-muted-foreground">平台状态</span>
                  <div className="mt-1">
                    <Badge variant={snapshot.platformConnected ? 'success' : 'destructive'}>
                      {snapshot.platformConnected ? '已连接' : '未连接'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 消息统计 */}
          <Card>
            <CardHeader>
              <CardTitle>消息统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                  <span className="text-sm text-muted-foreground">入站消息</span>
                  <p className="text-xl font-semibold mt-1">{snapshot.inboundMessages}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <span className="text-sm text-muted-foreground">出站消息</span>
                  <p className="text-xl font-semibold mt-1">{snapshot.outboundMessages}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <span className="text-sm text-muted-foreground">私聊会话</span>
                  <p className="text-xl font-semibold mt-1">{snapshot.privateConversations}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <span className="text-sm text-muted-foreground">群聊会话</span>
                  <p className="text-xl font-semibold mt-1">{snapshot.groupConversations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 运行状态 */}
          <Card>
            <CardHeader>
              <CardTitle>运行状态</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                  <span className="text-sm text-muted-foreground">平台运行时间</span>
                  <p className="text-xl font-semibold mt-1">{snapshot.platformUptime > 0 ? formatUptime(snapshot.platformUptime) : '-'}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <span className="text-sm text-muted-foreground">快捷回复</span>
                  <p className="text-xl font-semibold mt-1">{snapshot.quickReplies}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <span className="text-sm text-muted-foreground">插件数量</span>
                  <p className="text-xl font-semibold mt-1">{snapshot.plugins}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 活跃排行 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>活跃群组 Top 5</CardTitle>
              </CardHeader>
              <CardContent>
                {snapshot.topGroups.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">暂无数据</p>
                ) : (
                  <div className="space-y-3">
                    {snapshot.topGroups.map((g, i) => (
                      <div key={g.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                            i === 0 ? 'bg-yellow-500 text-white' :
                            i === 1 ? 'bg-gray-400 text-white' :
                            i === 2 ? 'bg-amber-700 text-white' :
                            'bg-muted text-muted-foreground'
                          }`}>{i + 1}</span>
                          <span className="font-medium">{g.name}</span>
                        </div>
                        <span className="text-muted-foreground">{g.messageCount} 条</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>活跃用户 Top 5</CardTitle>
              </CardHeader>
              <CardContent>
                {snapshot.topUsers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">暂无数据</p>
                ) : (
                  <div className="space-y-3">
                    {snapshot.topUsers.map((u, i) => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                            i === 0 ? 'bg-yellow-500 text-white' :
                            i === 1 ? 'bg-gray-400 text-white' :
                            i === 2 ? 'bg-amber-700 text-white' :
                            'bg-muted text-muted-foreground'
                          }`}>{i + 1}</span>
                          <span className="font-medium">{u.name}</span>
                        </div>
                        <span className="text-muted-foreground">{u.messageCount} 条</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
