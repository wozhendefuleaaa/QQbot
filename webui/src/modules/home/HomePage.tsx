import { useMemo } from 'react';
import { BotAccount, PlatformStatus, StatisticsSnapshot, PluginInfo } from '../../types';
import { cn } from '../../lib/utils';

type Props = {
  accounts: BotAccount[];
  platformStatus: PlatformStatus;
  snapshot: StatisticsSnapshot | null;
  plugins: PluginInfo[];
  config: { webName: string; notice: string };
};

export function HomePage({ accounts, platformStatus, snapshot, plugins, config }: Props) {
  // 统计数据
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

  // 快速操作卡片
  const quickActions = [
    { icon: '🔌', title: '连接平台', description: '连接QQ机器人平台', action: 'connect', color: 'bg-blue-500' },
    { icon: '💬', title: '发送消息', description: '快速发送消息给好友或群', action: 'chat', color: 'bg-green-500' },
    { icon: '🧩', title: '插件管理', description: '管理机器人插件', action: 'plugins', color: 'bg-purple-500' },
    { icon: '⚙️', title: '系统配置', description: '配置机器人参数', action: 'config', color: 'bg-orange-500' },
  ];

  return (
    <div className="flex-1 overflow-auto p-6 bg-background">
      {/* 欢迎区域 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          欢迎使用 {config.webName || 'Wawa-QQbot'}
        </h1>
        <p className="text-muted-foreground">
          {config.notice || '您的智能QQ机器人管理平台'}
        </p>
      </div>

      {/* 状态概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      {/* 平台状态 */}
      <div className="bg-card rounded-xl border p-6 mb-8 shadow-sm">
        <h2 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
          <span>📡</span> 平台连接状态
        </h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-3 h-3 rounded-full",
              platformStatus.connected ? "bg-green-500 animate-pulse" : 
              platformStatus.connecting ? "bg-yellow-500 animate-pulse" : "bg-red-500"
            )} />
            <div>
              <p className="font-medium text-card-foreground">
                {platformStatus.connected ? '已连接' : platformStatus.connecting ? '连接中...' : '未连接'}
              </p>
              <p className="text-sm text-muted-foreground">
                {platformStatus.connectedAccountName || '无账号连接'}
              </p>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            {platformStatus.lastConnectedAt && (
              <p>上次连接: {new Date(platformStatus.lastConnectedAt).toLocaleString()}</p>
            )}
            {platformStatus.lastError && (
              <p className="text-red-500">错误: {platformStatus.lastError}</p>
            )}
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">🚀 快速操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <div
              key={index}
              className="bg-card rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] group"
            >
              <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-3", action.color, "bg-opacity-10")}>
                {action.icon}
              </div>
              <h3 className="font-medium text-card-foreground group-hover:text-primary transition-colors">
                {action.title}
              </h3>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 使用指南 */}
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-card-foreground mb-4">📖 新手指南</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold shrink-0">
              1
            </div>
            <div>
              <h3 className="font-medium text-card-foreground">添加机器人账号</h3>
              <p className="text-sm text-muted-foreground">在账号管理中添加您的QQ机器人账号信息</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-300 font-bold shrink-0">
              2
            </div>
            <div>
              <h3 className="font-medium text-card-foreground">连接QQ平台</h3>
              <p className="text-sm text-muted-foreground">启动账号并连接到QQ官方机器人平台</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-300 font-bold shrink-0">
              3
            </div>
            <div>
              <h3 className="font-medium text-card-foreground">配置插件功能</h3>
              <p className="text-sm text-muted-foreground">根据需要启用和配置各种功能插件</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 统计卡片组件
function StatCard({ icon, title, value, subtitle, color }: {
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="bg-card rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-xl", color, "bg-opacity-10")}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-card-foreground mb-1">{value}</p>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}
