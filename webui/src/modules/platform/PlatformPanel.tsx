import { PlatformLog, PlatformStatus } from '../../types';
import { fmtTime } from '../../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Props = {
  platformStatus: PlatformStatus;
  platformLogs: PlatformLog[];
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
};

export function PlatformPanel({ platformStatus, platformLogs, onConnect, onDisconnect, onRefresh }: Props) {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <Card>
        <CardHeader>
          <CardTitle>QQ 平台连接</CardTitle>
          <CardDescription>管理 QQ 机器人平台连接状态</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button onClick={onConnect}>连接 QQ 平台</Button>
            <Button variant="destructive" onClick={onDisconnect}>断开连接</Button>
            <Button variant="outline" onClick={onRefresh}>刷新状态</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <span className="text-sm text-muted-foreground">连接状态</span>
              <div className="mt-1">
                <Badge variant={platformStatus.connected ? 'success' : platformStatus.connecting ? 'warning' : 'secondary'}>
                  {platformStatus.connected ? '已连接' : platformStatus.connecting ? '连接中' : '未连接'}
                </Badge>
              </div>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <span className="text-sm text-muted-foreground">已连接账号</span>
              <p className="mt-1 font-medium">{platformStatus.connectedAccountName || '-'}</p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <span className="text-sm text-muted-foreground">最近连接时间</span>
              <p className="mt-1 font-medium">{fmtTime(platformStatus.lastConnectedAt)}</p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <span className="text-sm text-muted-foreground">Token 过期时间</span>
              <p className="mt-1 font-medium">{fmtTime(platformStatus.tokenExpiresAt)}</p>
            </div>
            <div className="p-4 rounded-lg border bg-card md:col-span-2">
              <span className="text-sm text-muted-foreground">最近错误</span>
              <p className="mt-1 font-medium text-destructive">{platformStatus.lastError || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>平台日志</CardTitle>
          <CardDescription>查看平台连接日志</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-auto font-mono text-sm">
            {platformLogs.length === 0 ? (
              <p className="text-muted-foreground text-center">暂无日志</p>
            ) : (
              <div className="space-y-2">
                {platformLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex gap-2 ${
                      log.level === 'ERROR' ? 'text-destructive' :
                      log.level === 'WARN' ? 'text-yellow-600' :
                      log.level === 'INFO' ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <span className="font-semibold">[{log.level}]</span>
                    <span className="text-muted-foreground">{fmtTime(log.createdAt)}</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
