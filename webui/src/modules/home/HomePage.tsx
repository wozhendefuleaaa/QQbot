import { useMemo } from 'react';
import { BotAccount, PlatformStatus, StatisticsSnapshot, PluginInfo, MenuKey } from '../../types';
import { cn } from '../../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

type Props = {
  accounts: BotAccount[];
  platformStatus: PlatformStatus;
  snapshot: StatisticsSnapshot | null;
  plugins: PluginInfo[];
  config: { webName: string; notice: string };
  onNavigate?: (menu: MenuKey) => void;
};

export function HomePage({ accounts, platformStatus, snapshot, plugins, config, onNavigate }: Props) {
  const stats = useMemo(() => {
    const onlineAccounts = accounts.filter(a => a.status === 'ONLINE').length;
    const totalAccounts = accounts.length;
    const enabledPlugins = plugins.filter(p => p.enabled).length;
    const totalPlugins = plugins.length;
    
    return {
      onlineAccounts,
      totalAccounts,
      enabledPlugins,
      totalPlugins,
      totalMessages: (snapshot?.inboundMessages || 0) + (snapshot?.outboundMessages || 0),
      todayMessages: (snapshot?.inboundMessages || 0) + (snapshot?.outboundMessages || 0),
      totalGroups: snapshot?.groupConversations || 0,
      totalFriends: snapshot?.privateConversations || 0,
    };
  }, [accounts, plugins, snapshot]);

  const quickActions: { icon: string; title: string; description: string; action: MenuKey; color: string }[] = [
    { icon: '🔌', title: '平台接入', description: '管理 QQ 官方与 OneBot v11 连接', action: 'platform', color: 'bg-blue-500' },
    { icon: '💬', title: '发送消息', description: '快速发送消息给好友或群', action: 'chat', color: 'bg-green-500' },
    { icon: '🧩', title: '插件管理', description: '管理机器人插件', action: 'plugins', color: 'bg-purple-500' },
    { icon: '⚙️', title: '系统配置', description: '配置机器人参数', action: 'config', color: 'bg-orange-500' },
  ];

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 bg-background safe-area-inset-top">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 md:mb-2">
          欢迎使用 {config.webName || 'Wawa-QQbot'}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {config.notice || '您的智能机器人管理平台，支持 QQ 官方与 OneBot v11'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <StatCard
          icon="🤖"
          title="在线账号"
          value={`${stats.onlineAccounts}/${stats.totalAccounts}`}
          subtitle="个账号在线"
          color="bg-blue-500"
        />
        <StatCard
          icon="💬"
          title="今日消息"
          value={stats.todayMessages.toString()}
          subtitle={`总计 ${stats.totalMessages} 条`}
          color="bg-green-500"
        />
        <StatCard
          icon="🧩"
          title="启用插件"
          value={`${stats.enabledPlugins}/${stats.totalPlugins}`}
          subtitle="个插件运行中"
          color="bg-purple-500"
        />
        <StatCard
          icon="👥"
          title="社交关系"
          value={`${stats.totalFriends + stats.totalGroups}`}
          subtitle={`${stats.totalFriends} 好友 · ${stats.totalGroups} 群`}
          color="bg-orange-500"
        />
      </div>

      <Card className="mb-6 md:mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📡</span> 平台接入状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  platformStatus.connected ? "bg-green-500 animate-pulse" :
                  platformStatus.connecting ? "bg-yellow-500 animate-pulse" : "bg-red-500"
                )} />
                <span className="text-sm font-medium text-card-foreground">
                  {platformStatus.connected ? '已连接' : platformStatus.connecting ? '连接中...' : '未连接'}
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {platformStatus.connectedAccountName || '当前无 QQ 官方账号连接，可切换到平台页查看 OneBot 状态'}
                </p>
              </div>
            </div>
            <div className="text-left md:text-right text-xs md:text-sm text-muted-foreground">
              {platformStatus.lastConnectedAt && (
                <p>上次连接: {new Date(platformStatus.lastConnectedAt).toLocaleString()}</p>
              )}
              {platformStatus.lastError && (
                <p className="text-red-500">错误: {platformStatus.lastError}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 md:mb-8">
        <h2 className="text-base md:text-lg font-semibold text-foreground mb-3 md:mb-4">🚀 快速操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {quickActions.map((action, index) => (
            <Card
              key={index}
              className="cursor-pointer hover:shadow-lg transition-all active:scale-[0.98] md:hover:scale-[1.02] group"
              onClick={() => onNavigate?.(action.action)}
            >
              <CardContent className="p-3 md:p-4">
                <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center text-xl md:text-2xl mb-2 md:mb-3", action.color, "bg-opacity-10")}>
                  {action.icon}
                </div>
                <h3 className="text-sm md:text-base font-medium text-card-foreground group-hover:text-primary transition-colors">
                  {action.title}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground hidden md:block">{action.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📖</span> 新手指南
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="flex gap-3">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-sm md:text-base shrink-0">
                1
              </div>
              <div>
                <h3 className="text-sm md:text-base font-medium text-card-foreground">添加机器人账号</h3>
                <p className="text-xs md:text-sm text-muted-foreground">在账号管理中添加 QQ 官方或 OneBot v11 机器人账号信息</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-300 font-bold text-sm md:text-base shrink-0">
                2
              </div>
              <div>
                <h3 className="text-sm md:text-base font-medium text-card-foreground">接入消息平台</h3>
                <p className="text-xs md:text-sm text-muted-foreground">QQ 官方账号可直接连接，OneBot v11 账号可创建 Token 并等待反向 WebSocket 接入</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-300 font-bold text-sm md:text-base shrink-0">
                3
              </div>
              <div>
                <h3 className="text-sm md:text-base font-medium text-card-foreground">配置插件功能</h3>
                <p className="text-xs md:text-sm text-muted-foreground">根据需要启用和配置各种功能插件</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle, color }: {
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3 md:p-5">
        <div className="flex items-start justify-between mb-2 md:mb-3">
          <div className={cn("w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-lg md:text-xl", color, "bg-opacity-10")}>
            {icon}
          </div>
        </div>
        <p className="text-xl md:text-2xl font-bold text-card-foreground mb-0.5 md:mb-1">{value}</p>
        <p className="text-xs md:text-sm text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 md:mt-1 hidden md:block">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
