import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
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
import { api } from './services/api';
import { ThemeToggle } from './components/ui/theme-toggle';
import {
  AppConfig,
  BotAccount,
  ChatMessage,
  Conversation,
  MenuKey,
  OpenApiTokenView,
  PlatformLog,
  PlatformStatus,
  PluginInfo,
  PluginConfig,
  StatisticsSnapshot,
  SystemLog
} from './types';
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
  const { isAuthenticated, isLoading, user, logout, requirePasswordChange, clearRequirePasswordChange } = useAuth();
  const { theme } = useTheme();
  const [activeMenu, setActiveMenu] = useState<MenuKey>('home');

  const [accounts, setAccounts] = useState<BotAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [platformStatus, setPlatformStatus] = useState<PlatformStatus>({
    connected: false,
    connecting: false,
    connectedAccountId: null,
    connectedAccountName: null,
    lastConnectedAt: null,
    tokenExpiresAt: null,
    lastError: null
  });
  const [platformLogs, setPlatformLogs] = useState<PlatformLog[]>([]);

  const [config, setConfig] = useState<AppConfig>({
    webName: 'Wawa-QQbot',
    notice: '欢迎使用 Wawa-QQbot 智能机器人管理平台',
    allowOpenApi: true,
    defaultIntent: 0,
    pluginPermissions: {},
    updatedAt: new Date().toISOString()
  });
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [logType, setLogType] = useState<'all' | 'framework' | 'plugin' | 'openapi' | 'config'>('all');
  const [snapshot, setSnapshot] = useState<StatisticsSnapshot | null>(null);
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [pluginConfig, setPluginConfig] = useState<PluginConfig | null>(null);
  const [openApiEnabled, setOpenApiEnabled] = useState(true);
  const [openApiTokens, setOpenApiTokens] = useState<OpenApiTokenView[]>([]);
  const [newTokenName, setNewTokenName] = useState('');

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>('欢迎使用 QQ 机器人控制台。');
  const [noticeSeverity, setNoticeSeverity] = useState<'info' | 'success' | 'error'>('info');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // 辅助函数：设置通知
  const showNotice = (message: string, severity: 'info' | 'success' | 'error' = 'info') => {
    setNotice(message);
    setNoticeSeverity(severity);
  };

  // 辅助函数：设置错误通知
  const showError = (message: string) => showNotice(message, 'error');

  // 辅助函数：设置成功通知
  const showSuccess = (message: string) => showNotice(message, 'success');

  const [newAccount, setNewAccount] = useState({ name: '', appId: '', appSecret: '' });
  const [sendForm, setSendForm] = useState<{ targetType: 'user' | 'group'; targetId: string; text: string }>({
    targetType: 'user',
    targetId: '',
    text: ''
  });

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId),
    [conversations, selectedConversationId]
  );

  const loadAccounts = useCallback(async () => {
    const data = await api<{ items: BotAccount[] }>('/api/accounts');
    setAccounts(data.items);
    if (!selectedAccountId && data.items[0]) {
      setSelectedAccountId(data.items[0].id);
    }
  }, [selectedAccountId]);

  const loadConversations = useCallback(async (accountId: string) => {
    const data = await api<{ items: Conversation[] }>(`/api/conversations?accountId=${accountId}`);
    setConversations(data.items);
    if (data.items[0]) {
      setSelectedConversationId(data.items[0].id);
    } else {
      setSelectedConversationId('');
      setMessages([]);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const data = await api<{ items: ChatMessage[] }>(`/api/conversations/${conversationId}/messages`);
    setMessages(data.items);
  }, []);

  const loadPlatformStatus = useCallback(async () => {
    const data = await api<PlatformStatus>('/api/platform/status');
    setPlatformStatus(data);
  }, []);

  const loadPlatformLogs = useCallback(async () => {
    const data = await api<{ items: PlatformLog[] }>('/api/platform/logs?limit=100');
    setPlatformLogs(data.items);
  }, []);

  const loadConfig = useCallback(async () => {
    const data = await api<AppConfig>('/api/config');
    setConfig(data);
  }, []);

  const loadLogs = useCallback(async (nextType = logType) => {
    const data = await api<{ items: SystemLog[] }>(`/api/logs?type=${nextType}&limit=200`);
    setLogs(data.items);
  }, [logType]);

  const loadStatistics = useCallback(async () => {
    const data = await api<{ snapshot: StatisticsSnapshot }>('/api/statistics');
    setSnapshot(data.snapshot);
  }, []);

  const loadPlugins = useCallback(async () => {
    const data = await api<{ items: PluginInfo[] }>('/api/plugins');
    setPlugins(data.items);
  }, []);

  const loadPluginConfig = useCallback(async () => {
    const data = await api<PluginConfig>('/api/plugins/config');
    setPluginConfig(data);
  }, []);

  const loadOpenApi = useCallback(async () => {
    const data = await api<{ enabled: boolean; items: OpenApiTokenView[] }>('/api/openapi/tokens');
    setOpenApiEnabled(data.enabled);
    setOpenApiTokens(data.items);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    Promise.all([
      loadAccounts(),
      loadPlatformStatus(),
      loadPlatformLogs(),
      loadConfig(),
      loadLogs('all'),
      loadStatistics(),
      loadPlugins(),
      loadPluginConfig(),
      loadOpenApi()
    ])
      .catch((e: Error) => showError(e.message))
      .finally(() => setLoading(false));
  }, [isAuthenticated, loadAccounts, loadPlatformStatus, loadPlatformLogs, loadConfig, loadLogs, loadStatistics, loadPlugins, loadPluginConfig, loadOpenApi]);

  useEffect(() => {
    if (!isAuthenticated || !selectedAccountId) return;
    loadConversations(selectedAccountId).catch((e: Error) => showError(e.message));
  }, [isAuthenticated, selectedAccountId, loadConversations]);

  useEffect(() => {
    if (!isAuthenticated || !selectedConversationId) return;
    loadMessages(selectedConversationId).catch((e: Error) => showError(e.message));
  }, [isAuthenticated, selectedConversationId, loadMessages]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setInterval(() => {
      loadPlatformStatus().catch(() => undefined);
      if (activeMenu === 'platform') {
        loadPlatformLogs().catch(() => undefined);
      }
      if (activeMenu === 'logs') {
        loadLogs().catch(() => undefined);
      }
      if (activeMenu === 'statistics') {
        loadStatistics().catch(() => undefined);
      }
      if (activeMenu === 'chat' && selectedAccountId) {
        loadConversations(selectedAccountId)
          .then(() => {
            if (selectedConversationId) {
              return loadMessages(selectedConversationId);
            }
            return undefined;
          })
          .catch(() => undefined);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [isAuthenticated, activeMenu, logType, selectedAccountId, selectedConversationId, loadPlatformStatus, loadPlatformLogs, loadLogs, loadStatistics, loadConversations, loadMessages]);

  const createAccount = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await api<BotAccount>('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(newAccount)
      });
      showSuccess(`账号"${created.name}"已创建，请点击启动。`);
      setNewAccount({ name: '', appId: '', appSecret: '' });
      await loadAccounts();
      setSelectedAccountId(created.id);
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccount = async (account: BotAccount) => {
    const action = account.status === 'ONLINE' ? 'stop' : 'start';
    setLoading(true);
    try {
      await api(`/api/accounts/${account.id}/${action}`, { method: 'POST' });
      await loadAccounts();
      showSuccess(`账号"${account.name}"已${action === 'start' ? '启动' : '停用'}。`);
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      showError('请先选择账号。');
      return;
    }

    setLoading(true);
    try {
      const sendResult = await api<{ status: string }>('/api/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          accountId: selectedAccountId,
          targetType: sendForm.targetType,
          targetId: sendForm.targetId,
          text: sendForm.text
        })
      });
      showSuccess(`消息发送完成：${sendResult.status}`);
      setSendForm((prev) => ({ ...prev, text: '' }));
      await loadConversations(selectedAccountId);
      if (selectedConversationId) {
        await loadMessages(selectedConversationId);
      }
      await loadPlatformLogs();
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const connectPlatform = async () => {
    if (!selectedAccountId) {
      showError('请先在账号管理中选择账号。');
      return;
    }

    setLoading(true);
    try {
      await api('/api/platform/connect', {
        method: 'POST',
        body: JSON.stringify({ accountId: selectedAccountId })
      });
      await Promise.all([loadPlatformStatus(), loadPlatformLogs()]);
      showSuccess('已触发连接 QQ 平台。');
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const disconnectPlatform = async () => {
    setLoading(true);
    try {
      await api('/api/platform/disconnect', { method: 'POST', body: JSON.stringify({}) });
      await Promise.all([loadPlatformStatus(), loadPlatformLogs()]);
      showSuccess('已断开 QQ 平台连接。');
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/api/config', { method: 'POST', body: JSON.stringify(config) });
      await loadConfig();
      showSuccess('配置已保存。');
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const togglePlugin = async (pluginId: string) => {
    setLoading(true);
    try {
      await api(`/api/plugins/${pluginId}/toggle`, { method: 'POST' });
      await loadPlugins();
      showSuccess('插件状态已更新。');
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const reloadPlugin = async (pluginId: string) => {
    setLoading(true);
    try {
      await api(`/api/plugins/${pluginId}/reload`, { method: 'POST' });
      await loadPlugins();
      showSuccess('插件已重新加载。');
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const deletePlugin = async (pluginId: string) => {
    setLoading(true);
    try {
      await api(`/api/plugins/${pluginId}`, { method: 'DELETE' });
      await loadPlugins();
      showSuccess('插件已删除。');
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const updatePluginConfig = async (config: Partial<PluginConfig>) => {
    setLoading(true);
    try {
      const newConfig = { ...pluginConfig, ...config } as PluginConfig;
      await api('/api/plugins/config', { method: 'PUT', body: JSON.stringify(newConfig) });
      setPluginConfig(newConfig);
      showSuccess('插件配置已更新。');
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const uploadPlugin = async (filename: string, content: string) => {
    setLoading(true);
    try {
      await api('/api/plugins/upload', { method: 'POST', body: JSON.stringify({ filename, content }) });
      await loadPlugins();
      showSuccess('插件已上传。');
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadPluginSource = async (id: string) => {
    const data = await api<{ source: string; filename: string }>(`/api/plugins/${id}/source`);
    return data;
  };

  const savePluginSource = async (id: string, content: string) => {
    setLoading(true);
    try {
      await api(`/api/plugins/${id}/source`, { method: 'PUT', body: JSON.stringify({ content }) });
      await loadPlugins();
      showSuccess('插件源码已保存。');
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const createOpenApiToken = async () => {
    if (!newTokenName.trim()) {
      showError('请输入 Token 名称。');
      return;
    }
    setLoading(true);
    try {
      const created = await api<{ token: string; name: string }>('/api/openapi/tokens', { method: 'POST', body: JSON.stringify({ name: newTokenName }) });
      setNewTokenName('');
      await loadOpenApi();
      showSuccess(`OpenAPI Token 已创建。Token: ${created.token}（请立即保存，此值仅显示一次）`);
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleOpenApiToken = async (tokenId: string) => {
    setLoading(true);
    try {
      await api(`/api/openapi/tokens/${tokenId}/toggle`, { method: 'POST' });
      await loadOpenApi();
      showSuccess('OpenAPI Token 状态已更新。');
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const deleteOpenApiToken = async (tokenId: string) => {
    setLoading(true);
    try {
      await api(`/api/openapi/tokens/${tokenId}`, { method: 'DELETE' });
      await loadOpenApi();
      showSuccess('OpenAPI Token 已删除。');
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

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
  if (isLoading) {
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
          <span className="font-semibold text-lg">{config.webName || 'Wawa-QQbot'}</span>
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
          <h1 className="text-xl font-semibold">{config.webName || 'Wawa-QQbot 控制台'}</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Badge variant={platformStatus.connected ? 'success' : 'secondary'}>
              平台状态：{platformStatus.connected ? '已连接' : platformStatus.connecting ? '连接中' : '未连接'}
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
          title={config.webName || 'Wawa-QQbot'}
          platformStatus={platformStatus}
          user={user}
          onLogout={logout}
        />

        {/* 移动端状态指示栏 */}
        <div className="md:hidden flex items-center justify-between px-4 py-2 bg-muted/30 border-b text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${platformStatus.connected ? 'bg-green-500' : platformStatus.connecting ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`}></span>
            <span className="text-foreground">
              {platformStatus.connected ? '已连接' : platformStatus.connecting ? '连接中' : '未连接'}
            </span>
          </div>
          <ThemeToggle />
        </div>

        {(loading || notice || config.notice) && (
          <div className={cn(
            "px-4 md:px-6 py-2 md:py-3 border-b",
            loading ? "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800" :
            noticeSeverity === 'error' ? "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800" :
            noticeSeverity === 'success' ? "bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800" :
            "bg-muted/50"
          )}>
            <p className={cn(
              "text-sm truncate flex items-center gap-2",
              loading ? "text-blue-700 dark:text-blue-300" :
              noticeSeverity === 'error' ? "text-red-700 dark:text-red-300" :
              noticeSeverity === 'success' ? "text-green-700 dark:text-green-300" :
              "text-foreground"
            )}>
              {loading && <span className="animate-spin">⏳</span>}
              {noticeSeverity === 'error' && <span>❌</span>}
              {noticeSeverity === 'success' && <span>✅</span>}
              {loading ? '处理中，请稍候...' : notice || config.notice}
            </p>
          </div>
        )}

        {activeMenu === 'home' && (
          <HomePage
            accounts={accounts}
            platformStatus={platformStatus}
            snapshot={snapshot}
            plugins={plugins}
            config={config}
            onNavigate={setActiveMenu}
          />
        )}

        {activeMenu === 'accounts' && (
          <AccountsPanel
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            newAccount={newAccount}
            onNewAccountChange={setNewAccount}
            onCreateAccount={createAccount}
            onSelectAccount={setSelectedAccountId}
            onToggleAccount={toggleAccount}
          />
        )}

        {activeMenu === 'chat' && (
          <div className="flex-1 min-h-0 overflow-hidden p-4 lg:p-6">
            <ChatPanel
              accounts={accounts}
              platformStatus={platformStatus}
            />
          </div>
        )}

        {activeMenu === 'platform' && (
          <PlatformPanel
            platformStatus={platformStatus}
            platformLogs={platformLogs}
            onConnect={connectPlatform}
            onDisconnect={disconnectPlatform}
            onRefresh={() => {
              loadPlatformStatus().catch((e: Error) => showError(e.message));
              loadPlatformLogs().catch((e: Error) => showError(e.message));
            }}
          />
        )}

        {activeMenu === 'config' && <ConfigPanel config={config} onChange={setConfig} onSave={saveConfig} />}

        {activeMenu === 'logs' && (
          <LogsPanel
            logs={logs}
            logType={logType}
            onChangeType={(next) => {
              setLogType(next);
              loadLogs(next).catch((e: Error) => showError(e.message));
            }}
            onRefresh={() => loadLogs().catch((e: Error) => showError(e.message))}
          />
        )}

        {activeMenu === 'statistics' && (
          <StatisticsPanel snapshot={snapshot} onRefresh={() => loadStatistics().catch((e: Error) => showError(e.message))} />
        )}

        {activeMenu === 'openapi' && (
          <OpenApiPanel
            enabled={openApiEnabled}
            tokens={openApiTokens}
            newTokenName={newTokenName}
            onTokenNameChange={setNewTokenName}
            onCreateToken={createOpenApiToken}
            onToggleToken={toggleOpenApiToken}
            onDeleteToken={deleteOpenApiToken}
            onRefresh={() => loadOpenApi().catch((e: Error) => showError(e.message))}
          />
        )}

        {activeMenu === 'plugins' && (
          <PluginsPanel
            plugins={plugins}
            pluginConfig={pluginConfig}
            onTogglePlugin={togglePlugin}
            onReloadPlugin={reloadPlugin}
            onDeletePlugin={deletePlugin}
            onUpdateConfig={updatePluginConfig}
            onUploadPlugin={uploadPlugin}
            onLoadPluginSource={loadPluginSource}
            onSavePluginSource={savePluginSource}
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
