import { useEffect, useState } from 'react';
import { AccountsPanel } from './modules/accounts/AccountsPanel';
import { ChatPanel } from './modules/chat/ChatPanel';
import { PlatformPanel } from './modules/platform/PlatformPanel';
import { ConfigPanel } from './modules/config/ConfigPanel';
import { LogsPanel } from './modules/logs/LogsPanel';
import { StatisticsPanel } from './modules/statistics/StatisticsPanel';
import { OpenApiPanel } from './modules/openapi/OpenApiPanel';
import { PluginsPanel } from './modules/plugins/PluginsPanel';
import { LoginPage } from './modules/auth/LoginPage';
import { ChangePasswordDialog } from './modules/auth/ChangePasswordDialog';
import { HomePage } from './modules/home/HomePage';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './hooks/useTheme';
import { useNotification } from './hooks/useNotification';
import { useAppData } from './hooks/useAppData';
import { useAppActions } from './hooks/useAppActions';
import { ThemeToggle } from './components/ui/theme-toggle';
import { MenuKey } from './types';
import { Badge } from './components/ui/badge';
import { cn } from './lib/utils';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarNav,
  SidebarNavItem,
  MobileNav,
  MobileHeader,
} from './components/ui/sidebar';

function App() {
  const { isAuthenticated, isLoading: authLoading, user, logout, requirePasswordChange, clearRequirePasswordChange } = useAuth();
  const { theme } = useTheme();
  const [activeMenu, setActiveMenu] = useState<MenuKey>('home');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // 使用自定义 hooks
  const { notice, noticeSeverity, showNotice, showError, showSuccess } = useNotification();
  const appData = useAppData(isAuthenticated, showError);
  const appActions = useAppActions(
    showError,
    showSuccess,
    appData.loadAccounts,
    appData.loadConversations,
    appData.loadMessages,
    appData.loadPlatformStatus,
    appData.loadPlatformLogs,
    appData.loadConfig,
    appData.loadPlugins,
    appData.loadOpenApi
  );

  // 定期刷新数据
  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setInterval(() => {
      appData.loadPlatformStatus().catch(() => undefined);
      if (activeMenu === 'platform') {
        appData.loadPlatformLogs().catch(() => undefined);
      }
      if (activeMenu === 'logs') {
        appData.loadLogs().catch(() => undefined);
      }
      if (activeMenu === 'statistics') {
        appData.loadStatistics().catch(() => undefined);
      }
      if (activeMenu === 'chat' && appData.selectedAccountId) {
        appData.loadConversations(appData.selectedAccountId)
          .then(() => {
            if (appData.selectedConversationId) {
              return appData.loadMessages(appData.selectedConversationId);
            }
            return undefined;
          })
          .catch(() => undefined);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [isAuthenticated, activeMenu, appData]);

  const menuItems: { key: MenuKey; label: string }[] = [
    { key: 'home', label: '控制台首页' },
    { key: 'accounts', label: '账号管理' },
    { key: 'chat', label: '聊天中心' },
    { key: 'platform', label: 'QQ 平台连接' },
    { key: 'config', label: '配置中心' },
    { key: 'logs', label: '日志中心' },
    { key: 'statistics', label: '统计中心' },
    { key: 'openapi', label: '开放 API' },
    { key: 'plugins', label: '插件中心' }
  ];

  const getMenuIcon = (key: MenuKey) => {
    switch (key) {
      case 'home': return '🏠';
      case 'accounts': return '👥';
      case 'chat': return '💬';
      case 'platform': return '🔌';
      case 'config': return '⚙️';
      case 'logs': return '📋';
      case 'statistics': return '📊';
      case 'openapi': return '🔗';
      case 'plugins': return '🧩';
      default: return '📌';
    }
  };

  // 显示登录页面（如果未认证）
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="flex items-center gap-3 text-white">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>正在加载...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // 强制修改密码对话框
  if (requirePasswordChange) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <ChangePasswordDialog onSuccess={clearRequirePasswordChange} />
      </div>
    );
  }

  // 移动端底部导航项（精简版，只显示主要功能）
  const mobileNavItems = [
    { key: 'home', label: '首页', icon: '🏠' },
    { key: 'chat', label: '聊天', icon: '💬' },
    { key: 'platform', label: '平台', icon: '🔌' },
    { key: 'plugins', label: '插件', icon: '🧩' },
    { key: 'more', label: '更多', icon: '☰' },
  ];

  // 处理移动端导航点击
  const handleMobileNavClick = (key: string) => {
    if (key === 'more') {
      setShowMoreMenu(!showMoreMenu);
    } else {
      setActiveMenu(key as MenuKey);
      setShowMoreMenu(false);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* 桌面端侧边栏 */}
      <Sidebar className={theme === 'dark' ? 'bg-gradient-to-b from-slate-900 to-slate-800 text-white' : 'bg-gradient-to-b from-slate-100 to-white text-slate-900 border-r'}>
        <SidebarHeader className={theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}>
          <span className="text-2xl">🤖</span>
          <span className="font-semibold text-lg">{appData.config.webName || 'Wawa-QQbot'}</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav>
            {menuItems.map((item) => (
              <SidebarNavItem
                key={item.key}
                active={activeMenu === item.key}
                icon={getMenuIcon(item.key)}
                onClick={() => setActiveMenu(item.key)}
                className={activeMenu === item.key
                  ? theme === 'dark'
                    ? 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/30'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  : theme === 'dark'
                    ? 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }
              >
                {item.label}
              </SidebarNavItem>
            ))}
          </SidebarNav>
        </SidebarContent>
      </Sidebar>

      <main className="flex-1 flex flex-col overflow-hidden h-full pb-[calc(3.5rem+env(safe-area-inset-bottom,0))] md:pb-0">
        {/* 桌面端头部 */}
        <header className="hidden md:flex items-center justify-between px-6 py-4 border-b bg-card shrink-0">
          <h1 className="text-xl font-semibold">{appData.config.webName || 'Wawa-QQbot 控制台'}</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Badge variant={appData.platformStatus.connected ? 'success' : 'secondary'}>
              平台状态：{appData.platformStatus.connected ? '已连接' : appData.platformStatus.connecting ? '连接中' : '未连接'}
            </Badge>
            {user && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-foreground">
                  {user.username}
                  <span className="ml-1 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded dark:bg-blue-900 dark:text-blue-300">
                    {user.role === 'admin' ? '管理员' : '用户'}
                  </span>
                </span>
                <button
                  onClick={logout}
                  className="text-sm text-red-600 hover:text-red-700 hover:underline"
                >
                  退出登录
                </button>
              </div>
            )}
          </div>
        </header>

        {/* 移动端头部 */}
        <MobileHeader
          title={appData.config.webName || 'Wawa-QQbot'}
          platformStatus={appData.platformStatus}
          user={user}
          onLogout={logout}
        />

        {/* 移动端状态指示栏 */}
        <div className="md:hidden flex items-center justify-between px-4 py-2 bg-muted/30 border-b text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${appData.platformStatus.connected ? 'bg-green-500' : appData.platformStatus.connecting ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`}></span>
            <span className="text-foreground">
              {appData.platformStatus.connected ? '已连接' : appData.platformStatus.connecting ? '连接中' : '未连接'}
            </span>
          </div>
          <ThemeToggle />
        </div>

        {(appData.loading || notice || appData.config.notice) && (
          <div className={cn(
            "px-4 md:px-6 py-2 md:py-3 border-b",
            appData.loading ? "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800" :
            noticeSeverity === 'error' ? "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800" :
            noticeSeverity === 'success' ? "bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800" :
            "bg-muted/50"
          )}>
            <p className={cn(
              "text-sm truncate flex items-center gap-2",
              appData.loading ? "text-blue-700 dark:text-blue-300" :
              noticeSeverity === 'error' ? "text-red-700 dark:text-red-300" :
              noticeSeverity === 'success' ? "text-green-700 dark:text-green-300" :
              "text-foreground"
            )}>
              {appData.loading && <span className="animate-spin">⏳</span>}
              {noticeSeverity === 'error' && <span>❌</span>}
              {noticeSeverity === 'success' && <span>✅</span>}
              {appData.loading ? '处理中，请稍候...' : notice || appData.config.notice}
            </p>
          </div>
        )}

        {activeMenu === 'home' && (
          <HomePage
            accounts={appData.accounts}
            platformStatus={appData.platformStatus}
            snapshot={appData.snapshot}
            plugins={appData.plugins}
            config={appData.config}
            onNavigate={setActiveMenu}
          />
        )}

        {activeMenu === 'accounts' && (
          <AccountsPanel
            accounts={appData.accounts}
            selectedAccountId={appData.selectedAccountId || ''}
            newAccount={appData.newAccount}
            onNewAccountChange={appData.setNewAccount}
            onCreateAccount={(e) => appActions.createAccount(e, appData.newAccount, appData.setNewAccount, appData.setSelectedAccountId)}
            onSelectAccount={appData.setSelectedAccountId}
            onToggleAccount={appActions.toggleAccount}
          />
        )}

        {activeMenu === 'chat' && (
          <div className="flex-1 min-h-0 overflow-hidden p-4 lg:p-6">
            <ChatPanel
              accounts={appData.accounts}
              platformStatus={appData.platformStatus}
            />
          </div>
        )}

        {activeMenu === 'platform' && (
          <PlatformPanel
            platformStatus={appData.platformStatus}
            platformLogs={appData.platformLogs}
            onConnect={() => appActions.connectPlatform(appData.selectedAccountId || '')}
            onDisconnect={appActions.disconnectPlatform}
            onRefresh={() => {
              appData.loadPlatformStatus().catch((e: Error) => showError(e.message));
              appData.loadPlatformLogs().catch((e: Error) => showError(e.message));
            }}
          />
        )}

        {activeMenu === 'config' && (
          <ConfigPanel 
            config={appData.config} 
            onChange={appData.setConfig} 
            onSave={(e) => appActions.saveConfig(e, appData.config)} 
          />
        )}

        {activeMenu === 'logs' && (
          <LogsPanel
            logs={appData.logs}
            logType={appData.logType}
            onChangeType={(next) => {
              appData.setLogType(next);
              appData.loadLogs(next).catch((e: Error) => showError(e.message));
            }}
            onRefresh={() => appData.loadLogs().catch((e: Error) => showError(e.message))}
          />
        )}

        {activeMenu === 'statistics' && (
          <StatisticsPanel 
            snapshot={appData.snapshot} 
            onRefresh={() => appData.loadStatistics().catch((e: Error) => showError(e.message))} 
          />
        )}

        {activeMenu === 'openapi' && (
          <OpenApiPanel
            enabled={appData.openApiEnabled}
            tokens={appData.openApiTokens}
            newTokenName={appData.newTokenName}
            onTokenNameChange={appData.setNewTokenName}
            onCreateToken={() => appActions.createOpenApiToken(appData.newTokenName, appData.setNewTokenName)}
            onToggleToken={appActions.toggleOpenApiToken}
            onDeleteToken={appActions.deleteOpenApiToken}
            onRefresh={() => appData.loadOpenApi().catch((e: Error) => showError(e.message))}
          />
        )}

        {activeMenu === 'plugins' && (
          <PluginsPanel
            plugins={appData.plugins}
            pluginConfig={appData.pluginConfig}
            onTogglePlugin={appActions.togglePlugin}
            onReloadPlugin={appActions.reloadPlugin}
            onDeletePlugin={appActions.deletePlugin}
            onUpdateConfig={(config) => appActions.updatePluginConfig(config, appData.pluginConfig, appData.setPluginConfig)}
            onUploadPlugin={appActions.uploadPlugin}
            onLoadPluginSource={appActions.loadPluginSource}
            onSavePluginSource={appActions.savePluginSource}
          />
        )}
      </main>

      {/* 移动端底部导航 */}
      <MobileNav
        items={mobileNavItems}
        activeKey={showMoreMenu ? 'more' : activeMenu}
        onItemClick={handleMobileNavClick}
      />

      {/* 移动端更多菜单（弹出层） */}
      {showMoreMenu && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 animate-fade-in-overlay"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="absolute bottom-[calc(3.5rem+env(safe-area-inset-bottom,0))] left-0 right-0 bg-card border-t rounded-t-2xl p-4 animate-slide-up-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-4 gap-4">
              {menuItems.filter(item => !['home', 'chat', 'platform', 'plugins'].includes(item.key)).map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setActiveMenu(item.key);
                    setShowMoreMenu(false);
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted active:scale-95 transition-all"
                >
                  <span className="text-2xl">{getMenuIcon(item.key)}</span>
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </button>
              ))}
            </div>
            {/* 用户信息和退出按钮 */}
            {user && (
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{user.username}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded dark:bg-blue-900 dark:text-blue-300">
                    {user.role === 'admin' ? '管理员' : '用户'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setShowMoreMenu(false);
                  }}
                  className="text-sm text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
