import { FormEvent, useMemo, useState } from 'react';
import { OneBotConnectionInfo, OneBotCreateTokenResponse, OneBotStatusOverview, PlatformLog, PlatformStatus, BotAccount } from '../../types';
import { fmtTime } from '../../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { HelpTooltip, QuickTips, StatusBadge, EmptyState } from '@/components/ui/help-tooltip';

type Props = {
  platformStatus: PlatformStatus;
  platformLogs: PlatformLog[];
  accounts: BotAccount[];
  selectedAccountId: string;
  oneBotStatus: OneBotStatusOverview | null;
  oneBotConnections: OneBotConnectionInfo[];
  tokenName: string;
  createdToken: OneBotCreateTokenResponse | null;
  onTokenNameChange: (value: string) => void;
  onCreateToken: (e: FormEvent) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
};

export function PlatformPanel({
  platformStatus,
  platformLogs,
  accounts,
  selectedAccountId,
  oneBotStatus,
  oneBotConnections,
  tokenName,
  createdToken,
  onTokenNameChange,
  onCreateToken,
  onConnect,
  onDisconnect,
  onRefresh,
}: Props) {
  const [activeTab, setActiveTab] = useState<'qq_official' | 'onebot_v11'>('qq_official');

  const officialAccounts = useMemo(
    () => accounts.filter((account) => (account.platformType || 'qq_official') === 'qq_official'),
    [accounts]
  );

  const oneBotAccounts = useMemo(
    () => accounts.filter((account) => account.platformType === 'onebot_v11'),
    [accounts]
  );

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) || null,
    [accounts, selectedAccountId]
  );

  const selectedOneBotAccount = selectedAccount?.platformType === 'onebot_v11' ? selectedAccount : null;

  const getConnectionStatus = (): 'success' | 'warning' | 'error' | 'loading' => {
    if (platformStatus.connected) return 'success';
    if (platformStatus.connecting) return 'loading';
    if (platformStatus.lastError) return 'error';
    return 'warning';
  };

  const getOneBotStatus = (): 'success' | 'warning' | 'loading' => {
    if ((oneBotStatus?.onlineAccounts || 0) > 0) return 'success';
    if ((oneBotStatus?.enabledAccounts || 0) > 0) return 'loading';
    return 'warning';
  };

  return (
    <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6 overflow-auto safe-area-inset-top">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={activeTab === 'qq_official' ? 'default' : 'outline'}
          onClick={() => setActiveTab('qq_official')}
        >
          QQ 官方
        </Button>
        <Button
          type="button"
          variant={activeTab === 'onebot_v11' ? 'default' : 'outline'}
          onClick={() => setActiveTab('onebot_v11')}
        >
          OneBot v11
        </Button>
      </div>

      {activeTab === 'qq_official' ? (
        <>
          {!platformStatus.connected && !platformStatus.connecting && (
            <QuickTips
              tips={[
                '连接前请先在「账号管理」中添加并启动 QQ 官方机器人账号',
                '连接成功后，机器人将开始接收和发送官方平台消息',
                '如遇连接问题，请检查 App ID 和 App Secret 是否正确',
              ]}
              title="🔗 QQ 官方连接指南"
            />
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>QQ 平台连接</CardTitle>
                <HelpTooltip content="管理 QQ 机器人与官方平台的连接状态" position="right" />
              </div>
              <CardDescription>适用于 QQ 官方机器人账号的长连接管理</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <HelpTooltip content="连接到 QQ 官方机器人平台，开始接收消息" position="top">
                  <Button onClick={onConnect} className="gap-2" disabled={officialAccounts.length === 0}>
                    <span>🔗</span> 连接 QQ 平台
                  </Button>
                </HelpTooltip>
                <HelpTooltip content="断开与 QQ 平台的连接，停止接收消息" position="top">
                  <Button variant="destructive" onClick={onDisconnect} className="gap-2">
                    <span>断开</span>
                  </Button>
                </HelpTooltip>
                <HelpTooltip content="刷新当前连接状态与日志信息" position="top">
                  <Button variant="outline" onClick={onRefresh} className="gap-2">
                    <span>🔄</span> 刷新状态
                  </Button>
                </HelpTooltip>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-black">连接状态</span>
                    <HelpTooltip content="显示当前与 QQ 官方平台的连接状态" position="top" />
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
                    <HelpTooltip content="当前连接的 QQ 官方机器人账号名称" position="top" />
                  </div>
                  <p className="mt-1 font-medium">{platformStatus.connectedAccountName || '-'}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-black">最近连接时间</span>
                    <HelpTooltip content="上次成功连接 QQ 官方平台的时间" position="top" />
                  </div>
                  <p className="mt-1 font-medium">{fmtTime(platformStatus.lastConnectedAt)}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-black">Token 过期时间</span>
                    <HelpTooltip content="访问令牌有效期，过期后需重新连接" position="top" />
                  </div>
                  <p className="mt-1 font-medium">{fmtTime(platformStatus.tokenExpiresAt)}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-black">官方账号数</span>
                    <HelpTooltip content="当前系统中配置的 QQ 官方账号数量" position="top" />
                  </div>
                  <p className="mt-1 font-medium">{officialAccounts.length}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card md:col-span-2 xl:col-span-1 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-black">最近错误</span>
                    <HelpTooltip content="如果连接失败，这里会显示错误信息" position="top" />
                  </div>
                  <p className="mt-1 font-medium text-destructive break-all">{platformStatus.lastError || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>平台日志</CardTitle>
                <HelpTooltip content="查看 QQ 官方平台连接的详细日志记录" position="right" />
              </div>
              <CardDescription>包含连接、鉴权、消息收发等平台日志</CardDescription>
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
                          log.level === 'ERROR'
                            ? 'text-destructive'
                            : log.level === 'WARN'
                              ? 'text-yellow-600'
                              : log.level === 'INFO'
                                ? 'text-primary'
                                : 'text-black'
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
        </>
      ) : (
        <>
          <QuickTips
            title="🔁 OneBot v11 接入指南"
            tips={[
              '先在「账号管理」中创建 OneBot v11 账号并点击启动，使账号处于启用状态',
              '在当前页面为该账号创建 Token，并在 OneBot 客户端中使用 Bearer Token 反向连接',
              '连接建立后，此处会显示在线连接、最近心跳和客户端来源信息',
            ]}
          />

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>OneBot v11 总览</CardTitle>
                <HelpTooltip content="展示 OneBot v11 反向 WebSocket 的启用、在线与 Token 使用情况" position="right" />
              </div>
              <CardDescription>适用于反向 WebSocket 接入的 OneBot 机器人客户端</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge
                  status={getOneBotStatus()}
                  text={
                    (oneBotStatus?.onlineAccounts || 0) > 0
                      ? '存在在线连接'
                      : (oneBotStatus?.enabledAccounts || 0) > 0
                        ? '账号已启用，等待连接'
                        : '尚未启用账号'
                  }
                  pulse={(oneBotStatus?.onlineAccounts || 0) > 0}
                />
                <Button variant="outline" onClick={onRefresh} className="gap-2">
                  <span>🔄</span> 刷新状态
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-black">OneBot 账号</p>
                  <p className="mt-1 text-2xl font-semibold">{oneBotAccounts.length}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-black">已启用</p>
                  <p className="mt-1 text-2xl font-semibold">{oneBotStatus?.enabledAccounts || 0}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-black">在线账号</p>
                  <p className="mt-1 text-2xl font-semibold">{oneBotStatus?.onlineAccounts || 0}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-black">活动连接</p>
                  <p className="mt-1 text-2xl font-semibold">{oneBotStatus?.totalConnections || 0}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-black">有效 Token</p>
                  <p className="mt-1 text-2xl font-semibold">{oneBotStatus?.activeTokens || 0}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-black">最近事件</p>
                  <p className="mt-1 text-sm font-medium break-words">{fmtTime(oneBotStatus?.lastEventAt || null)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>创建 OneBot Token</CardTitle>
                <HelpTooltip content="为已选中的 OneBot 账号创建 Bearer Token，明文仅返回一次，请及时保存" position="right" />
              </div>
              <CardDescription>当前选中账号必须是 OneBot v11 且建议先启动</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-muted/40">
                  <p className="text-sm text-black">当前选中账号</p>
                  <div className="mt-2 space-y-1">
                    <p className="font-medium">{selectedOneBotAccount?.name || '未选中 OneBot 账号'}</p>
                    <p className="text-sm text-black">Self ID: {selectedOneBotAccount?.onebotSelfId || '-'}</p>
                    <div className="pt-1">
                      <Badge variant={selectedOneBotAccount?.status === 'ONLINE' ? 'success' : 'secondary'}>
                        {selectedOneBotAccount?.status === 'ONLINE' ? '已启用' : selectedOneBotAccount ? '未启用' : '不可用'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <form onSubmit={onCreateToken} className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-card-foreground">Token 名称</label>
                    <Input
                      value={tokenName}
                      onChange={(e) => onTokenNameChange(e.target.value)}
                      placeholder="例如：NapCat 主实例"
                      disabled={!selectedOneBotAccount}
                    />
                  </div>
                  <Button type="submit" disabled={!selectedOneBotAccount || !tokenName.trim()}>
                    创建 Token
                  </Button>
                </form>
              </div>

              {createdToken && (
                <div className="rounded-lg border border-green-500/40 bg-green-50 dark:bg-green-950/20 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔐</span>
                    <p className="font-medium text-green-700 dark:text-green-300">Token 创建成功</p>
                  </div>
                  <p className="text-sm text-black">名称：{createdToken.item.name}</p>
                  <p className="text-sm text-black">请立即保存以下 Bearer Token，页面刷新后将无法再次查看：</p>
                  <code className="block rounded bg-black text-green-300 p-3 text-xs md:text-sm break-all">{createdToken.token}</code>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>实时连接列表</CardTitle>
                <HelpTooltip content="显示当前已建立的反向 WebSocket 连接及其心跳状态" position="right" />
              </div>
              <CardDescription>连接建立后会自动绑定到对应 OneBot 账号</CardDescription>
            </CardHeader>
            <CardContent>
              {oneBotConnections.length === 0 ? (
                <EmptyState
                  icon="🛰️"
                  title="暂无 OneBot 连接"
                  description="请先启用账号并使用 Bearer Token 从 OneBot 客户端发起反向 WebSocket 连接"
                />
              ) : (
                <div className="space-y-3">
                  {oneBotConnections.map((connection) => (
                    <div key={connection.connectionId} className="rounded-lg border p-4 bg-card space-y-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">{connection.accountName}</p>
                            <Badge variant="success">在线</Badge>
                          </div>
                          <p className="text-sm text-black">Self ID: {connection.selfId || '-'}</p>
                        </div>
                        <div className="text-sm text-black md:text-right">
                          <p>连接时间：{fmtTime(connection.connectedAt)}</p>
                          <p>最后活跃：{fmtTime(connection.lastSeenAt)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-black">连接 ID</p>
                          <p className="font-medium break-all">{connection.connectionId}</p>
                        </div>
                        <div>
                          <p className="text-black">Token ID</p>
                          <p className="font-medium break-all">{connection.tokenId}</p>
                        </div>
                        <div>
                          <p className="text-black">远端地址</p>
                          <p className="font-medium break-all">{connection.remoteAddress || '-'}</p>
                        </div>
                        <div>
                          <p className="text-black">客户端 UA</p>
                          <p className="font-medium break-all">{connection.userAgent || '-'}</p>
                        </div>
                      </div>

                      <p className="text-sm text-black">最近心跳：{fmtTime(connection.lastHeartbeatAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
