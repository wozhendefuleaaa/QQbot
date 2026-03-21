import { PlatformLog, PlatformStatus } from '../../types';
import { fmtTime } from '../../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpTooltip, QuickTips, StatusBadge, EmptyState } from '@/components/ui/help-tooltip';

type Props = {
  platformStatus: PlatformStatus;
  platformLogs: PlatformLog[];
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
};

export function PlatformPanel({ platformStatus, platformLogs, onConnect, onDisconnect, onRefresh }: Props) {
  const getConnectionStatus = (): 'success' | 'warning' | 'error' | 'loading' => {
    if (platformStatus.connected) return 'success';
    if (platformStatus.connecting) return 'loading';
    if (platformStatus.lastError) return 'error';
    return 'loading';
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* 新手引导 */}
      {!platformStatus.connected && !platformStatus.connecting && (
        <QuickTips
          tips={[
            '连接前请先在「账号管理」中添加并启动机器人账号',
            '连接成功后，机器人将开始接收和发送消息',
            '如遇连接问题，请检查 App ID 和 App Secret 是否正确'
          ]}
          title="🔗 连接指南"
        />
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>QQ 平台连接</CardTitle>
            <HelpTooltip content="管理 QQ 机器人与官方平台的连接状态" position="right" />
          </div>
          <CardDescription>管理 QQ 机器人平台连接状态</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <HelpTooltip content="连接到 QQ 官方机器人平台，开始接收消息" position="top">
              <Button onClick={onConnect} className="gap-2">
                <span>🔗</span> 连接 QQ 平台
              </Button>
            </HelpTooltip>
            <HelpTooltip content="断开与 QQ 平台的连接，停止接收消息" position="top">
              <Button variant="destructive" onClick={onDisconnect} className="gap-2">
                <span>断开</span>
              </Button>
            </HelpTooltip>
            <HelpTooltip content="刷新当前连接状态信息" position="top">
              <Button variant="outline" onClick={onRefresh} className="gap-2">
                <span>🔄</span> 刷新状态
              </Button>
            </HelpTooltip>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-black">连接状态</span>
                <HelpTooltip content="显示当前与 QQ 平台的连接状态" position="top" />
              </div>
              <div className="mt-1">
                <StatusBadge
                  status={getConnectionStatus()}
                  text={platformStatus.connected ? '已连接' : platformStatus.connecting ? '连接中' : '未连接'}
                  pulse={platformStatus.connected || platformStatus.connecting}
                />
              </div>
            </div>
            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-black">已连接账号</span>
                <HelpTooltip content="当前连接的机器人账号名称" position="top" />
              </div>
              <p className="mt-1 font-medium">{platformStatus.connectedAccountName || '-'}</p>
            </div>
            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-black">最近连接时间</span>
                <HelpTooltip content="上次成功连接的时间" position="top" />
              </div>
              <p className="mt-1 font-medium">{fmtTime(platformStatus.lastConnectedAt)}</p>
            </div>
            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-black">Token 过期时间</span>
                <HelpTooltip content="访问令牌的有效期限，过期后需重新连接" position="top" />
              </div>
              <p className="mt-1 font-medium">{fmtTime(platformStatus.tokenExpiresAt)}</p>
            </div>
            <div className="p-4 rounded-lg border bg-card md:col-span-2 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-black">最近错误</span>
                <HelpTooltip content="如果连接失败，这里会显示错误信息" position="top" />
              </div>
              <p className="mt-1 font-medium text-destructive">{platformStatus.lastError || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>平台日志</CardTitle>
            <HelpTooltip content="查看平台连接的详细日志记录" position="right" />
          </div>
          <CardDescription>查看平台连接日志</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-auto font-mono text-sm">
            {platformLogs.length === 0 ? (
              <EmptyState
                icon="📋"
                title="暂无日志记录"
                description="连接平台后，这里会显示相关的日志信息"
              />
            ) : (
              <div className="space-y-2">
                {platformLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex gap-2 ${
                      log.level === 'ERROR' ? 'text-destructive' :
                      log.level === 'WARN' ? 'text-yellow-600' :
                      log.level === 'INFO' ? 'text-primary' : 'text-black'
                    }`}
                  >
                    <span className="font-semibold">[{log.level}]</span>
                    <span className="text-black">{fmtTime(log.createdAt)}</span>
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
