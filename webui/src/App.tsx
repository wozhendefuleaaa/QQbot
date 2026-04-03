import React, { FormEvent, useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LoginPage } from './modules/auth/LoginPage';
import { ChangePasswordDialog } from './modules/auth/ChangePasswordDialog';

// 懒加载组件
const HomePage = React.lazy(() => import('./modules/home/HomePage').then(module => ({ default: module.HomePage })));
const AccountsPanel = React.lazy(() => import('./modules/accounts/AccountsPanel').then(module => ({ default: module.AccountsPanel })));
const ChatPanel = React.lazy(() => import('./modules/chat/ChatPanel').then(module => ({ default: module.ChatPanel })));
const PlatformPanel = React.lazy(() => import('./modules/platform/PlatformPanel').then(module => ({ default: module.PlatformPanel })));
const ConfigPanel = React.lazy(() => import('./modules/config/ConfigPanel').then(module => ({ default: module.ConfigPanel })));
const LogsPanel = React.lazy(() => import('./modules/logs/LogsPanel').then(module => ({ default: module.LogsPanel })));
const StatisticsPanel = React.lazy(() => import('./modules/statistics/StatisticsPanel').then(module => ({ default: module.StatisticsPanel })));
const OpenApiPanel = React.lazy(() => import('./modules/openapi/OpenApiPanel').then(module => ({ default: module.OpenApiPanel })));
const PluginsPanel = React.lazy(() => import('./modules/plugins/PluginsPanel').then(module => ({ default: module.PluginsPanel })));
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
  OneBotConnectionInfo,
  OneBotCreateTokenResponse,
  OneBotStatusOverview,
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
  const queryClient = useQueryClient();
  const [activeMenu, setActiveMenu] = useState<MenuKey>('home');

  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [newTokenName, setNewTokenName] = useState('');
  const [newOneBotTokenName, setNewOneBotTokenName] = useState('');
  const [createdOneBotToken, setCreatedOneBotToken] = useState<OneBotCreateTokenResponse | null>(null);

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
  const [newOneBotAccount, setNewOneBotAccount] = useState({ name: '', selfId: '' });
  const [sendForm, setSendForm] = useState<{ targetType: 'user' | 'group'; targetId: string; text: string }>({
    targetType: 'user',
    targetId: '',
    text: ''
  });

  // API 请求使用 React Query
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api<{ items: BotAccount[] }>('/api/accounts'),
    enabled: isAuthenticated,
    refetchInterval: 30000, // 30秒自动刷新
  });

  const accounts = accountsData?.items || [];

  const { data: conversationsData } = useQuery({
    queryKey: ['conversations', selectedAccountId],
    queryFn: () => api<{ items: Conversation[] }>(`/api/conversations?accountId=${selectedAccountId}`),
    enabled: isAuthenticated && !!selectedAccountId,
    refetchInterval: 15000, // 15秒自动刷新
  });

  const conversations = conversationsData?.items || [];

  const { data: messagesData } = useQuery({
    queryKey: ['messages', selectedConversationId],
    queryFn: () => api<{ items: ChatMessage[] }>(`/api/conversations/${selectedConversationId}/messages`),
    enabled: isAuthenticated && !!selectedConversationId,
    refetchInterval: 10000, // 10秒自动刷新
  });

  const messages = messagesData?.items || [];

  const { data: platformStatus } = useQuery({
    queryKey: ['platformStatus'],
    queryFn: () => api<PlatformStatus>('/api/platform/status'),
    enabled: isAuthenticated,
    refetchInterval: 5000, // 5秒自动刷新
  });

  const { data: platformLogsData } = useQuery({
    queryKey: ['platformLogs'],
    queryFn: () => api<{ items: PlatformLog[] }>('/api/platform/logs?limit=100'),
    enabled: isAuthenticated,
    refetchInterval: 10000, // 10秒自动刷新
  });

  const platformLogs = platformLogsData?.items || [];

  const { data: oneBotStatus } = useQuery({
    queryKey: ['oneBotStatus'],
    queryFn: () => api<OneBotStatusOverview>('/api/onebot/status'),
    enabled: isAuthenticated,
    refetchInterval: 5000, // 5秒自动刷新
  });

  const { data: oneBotConnectionsData } = useQuery({
    queryKey: ['oneBotConnections'],
    queryFn: () => api<{ items: OneBotConnectionInfo[] }>('/api/onebot/connections'),
    enabled: isAuthenticated,
    refetchInterval: 10000, // 10秒自动刷新
  });

  const oneBotConnections = oneBotConnectionsData?.items || [];

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => api<AppConfig>('/api/config'),
    enabled: isAuthenticated,
    refetchInterval: 60000, // 1分钟自动刷新
  });

  const [logType, setLogType] = useState<'all' | 'framework' | 'plugin' | 'openapi' | 'config'>('all');
  const { data: logsData } = useQuery({
    queryKey: ['logs', logType],
    queryFn: () => api<{ items: SystemLog[] }>(`/api/logs?type=${logType}&limit=200`),
    enabled: isAuthenticated,
    refetchInterval: 15000, // 15秒自动刷新
  });

  const logs = logsData?.items || [];

  const { data: statisticsData } = useQuery({
    queryKey: ['statistics'],
    queryFn: () => api<{ snapshot: StatisticsSnapshot }>('/api/statistics'),
    enabled: isAuthenticated,
    refetchInterval: 30000, // 30秒自动刷新
  });

  const snapshot = statisticsData?.snapshot || null;

  const { data: pluginsData } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => api<{ items: PluginInfo[] }>('/api/plugins'),
    enabled: isAuthenticated,
    refetchInterval: 30000, // 30秒自动刷新
  });

  const plugins = pluginsData?.items || [];

  const { data: pluginConfig } = useQuery({
    queryKey: ['pluginConfig'],
    queryFn: () => api<PluginConfig>('/api/plugins/config'),
    enabled: isAuthenticated,
    refetchInterval: 60000, // 1分钟自动刷新
  });

  const { data: openApiData } = useQuery({
    queryKey: ['openApi'],
    queryFn: () => api<{ enabled: boolean; items: OpenApiTokenView[] }>('/api/openapi/tokens'),
    enabled: isAuthenticated,
    refetchInterval: 30000, // 30秒自动刷新
  });

  const openApiEnabled = openApiData?.enabled || true;
  const openApiTokens = openApiData?.items || [];

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId),
    [conversations, selectedConversationId]
  );

  // 当accounts加载完成后，自动选择第一个账号
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // 当conversations加载完成后，自动选择第一个会话
  useEffect(() => {
    if (conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    } else {
      setSelectedConversationId('');
    }
  }, [conversations]);

  // 使用 React Query 的 useMutation 来处理修改操作
  const createAccountMutation = useMutation({
    mutationFn: (account: { name: string; appId: string; appSecret: string }) =>
      api<BotAccount>('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(account)
      }),
    onSuccess: (created) => {
      showSuccess(`QQ 官方账号"${created.name}"已创建，请点击启动。`);
      setNewAccount({ name: '', appId: '', appSecret: '' });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setSelectedAccountId(created.id);
    },
    onError: (error) => {
      showError((error as Error).message);
    }
  });

  const createAccount = async (e: FormEvent) => {
    e.preventDefault();
    createAccountMutation.mutate(newAccount);
  };

  const createOneBotAccountMutation = useMutation({
    mutationFn: (account: { name: string; selfId: string }) =>
      api<BotAccount>('/api/onebot/accounts', {
        method: 'POST',
        body: JSON.stringify(account)
      }),
    onSuccess: (created) => {
      showSuccess(`OneBot 账号"${created.name}"已创建，请启动后为客户端创建 Token。`);
      setNewOneBotAccount({ name: '', selfId: '' });
      setCreatedOneBotToken(null);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setSelectedAccountId(created.id);
    },
    onError: (error) => {
      showError((error as Error).message);
    }
  });

  const createOneBotAccount = async (e: FormEvent) => {
    e.preventDefault();
    createOneBotAccountMutation.mutate(newOneBotAccount);
  };

  const createOneBotTokenMutation = useMutation({
    mutationFn: (data: { accountId: string; name: string }) =>
      api<OneBotCreateTokenResponse>('/api/onebot/tokens', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: (created) => {
      setCreatedOneBotToken(created);
      setNewOneBotTokenName('');
      queryClient.invalidateQueries({ queryKey: ['oneBotStatus'] });
      queryClient.invalidateQueries({ queryKey: ['oneBotConnections'] });
      showSuccess(`OneBot Token "${created.item.name}" 已创建，请立即保存。`);
    },
    onError: (error) => {
      showError((error as Error).message);
    }
  });

  const createOneBotToken = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      showError('请先选择 OneBot 账号。');
      return;
    }

    const selected = accounts.find((account) => account.id === selectedAccountId);
    if (!selected || selected.platformType !== 'onebot_v11') {
      showError('当前选中的不是 OneBot v11 账号。');
      return;
    }

    if (!newOneBotTokenName.trim()) {
      showError('请输入 OneBot Token 名称。');
      return;
    }

    createOneBotTokenMutation.mutate({ accountId: selectedAccountId, name: newOneBotTokenName });
  };

  const toggleAccountMutation = useMutation({
    mutationFn: ({ accountId, action }: { accountId: string; action: string }) =>
      api(`/api/accounts/${accountId}/${action}`, { method: 'POST' }),
    onSuccess: (_, variables) => {
      const { accountId, action } = variables;
      const account = accounts.find(a => a.id === accountId);
      if (account) {
        showSuccess(`账号"${account.name}"已${action === 'start' ? '启动' : '停用'}。`);
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        if (account.platformType === 'onebot_v11') {
          queryClient.invalidateQueries({ queryKey: ['oneBotStatus'] });
          queryClient.invalidateQueries({ queryKey: ['oneBotConnections'] });
        }
      }
    },
    onError: (error) => {
      showError((error as Error).message);
    }
  });

  const toggleAccount = async (account: BotAccount) => {
    const action = account.status === 'ONLINE' ? 'stop' : 'start';
    toggleAccountMutation.mutate({ accountId: account.id, action });
  };

  const sendMessageMutation = useMutation({
    mutationFn: (data: { accountId: string; targetType: 'user' | 'group'; targetId: string; text: string }) =>
      api<{ status: string }>('/api/messages/send', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: (sendResult, variables) => {
      showSuccess(`消息发送完成：${sendResult.status}`);
      setSendForm((prev) => ({ ...prev, text: '' }));
      queryClient.invalidateQueries({ queryKey: ['conversations', variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ['platformLogs'] });
    },
    onError: (error) => {
      showError((error as Error).message);
    }
  });

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      showError('请先选择账号。');
      return;
    }

    sendMessageMutation.mutate({
      accountId: selectedAccountId,
      targetType: sendForm.targetType,
      targetId: sendForm.targetId,
      text: sendForm.text
    });
  };

  const connectPlatformMutation = useMutation({
    mutationFn: (accountId: string) =>
      api('/api/platform/connect', {
        method: 'POST',
        body: JSON.stringify({ accountId })
      }),
    onSuccess: () => {
      showSuccess('已触发连接 QQ 平台。');
      queryClient.invalidateQueries({ queryKey: ['platformStatus'] });
      queryClient.invalidateQueries({ queryKey: ['platformLogs'] });
    },
    onError: (error) => {
      showError((error as Error).message);
    }
  });

  const connectPlatform = async () => {
    if (!selectedAccountId) {
      showError('请先在账号管理中选择账号。');
      return;
    }

    connectPlatformMutation.mutate(selectedAccountId);
  };

  const disconnectPlatformMutation = useMutation({
    mutationFn: () =>
      api('/api/platform/disconnect', { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => {
      showSuccess('已断开 QQ 平台连接。');
      queryClient.invalidateQueries({ queryKey: ['platformStatus'] });
      queryClient.invalidateQueries({ queryKey: ['platformLogs'] });
    },
    onError: (error) => {
      showError((error as Error).message);
    }
  });

  const disconnectPlatform = async () => {
    disconnectPlatformMutation.mutate();
  };

  const saveConfigMutation = useMutation({
    mutationFn: (config: AppConfig) =>
      api('/api/config', { method: 'POST', body: JSON.stringify(config) }),
    onSuccess: () => {
      showSuccess('配置已保存。');
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
    onError: (error) => {
      showError((error as Error).message);
    }
  });

  const saveConfig = async (e: FormEvent) => {
    e.preventDefault();
    if (config) {
      saveConfigMutation.mutate(config);
    }
  };

  const togglePluginMutation = useMutation({
    mutationFn: (pluginId: string) =>
      api(`/api/plugins/${pluginId}/toggle`, { method: 'POST' }),
    onSuccess: () => {
      showSuccess('插件状态已更新。');
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
    onError: (error) => {
      showError((error as Error).message);
    }
  });

  const togglePlugin = async (pluginId: string) => {
    togglePluginMutation.mutate(pluginId);
  };

  const reloadPluginMutation = useMutation({
    mutationFn: (pluginId: string) =>
      api(`/api/plugins/${pluginId}/reload`, { method: 'POST' }),
    onSuccess: () => {
      showSuccess('插件已重新加载。');
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
    onError: (error) => {
      showError((error as Error).message);
    }
  });

  const reloadPlugin = async (pluginId: string) => {
    reloadPluginMutation.mutate(pluginId);
  };

  const deletePluginMutation = useMutation({
    mutationFn: (pluginId: string) =>
      api(`/api/plugins/${pluginId}`, { method: 'DELETE' }),
    onSuccess: () => {
      showSuccess('插件已删除。');
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
    onError: (error) => {
      showError((error as Error).message);
    }
  });

  const deletePlugin = async (pluginId: string) => {
    deletePluginMutation.mutate(pluginId);
  };

  const updatePluginConfigMutation = useMutation({
    mutationFn: (config: PluginConfig) =>
      api('/api/plugins/config', { method: 'PUT', body: JSON.stringify(config) }),
    onSuccess: () => {
      showSuccess('插件配置已更新。');
      queryClient.invalidateQueries({ queryKey: ['pluginConfig'] });
    },
    onError: (error) => {
      showError((error as Error).message);
    }
  });

  const updatePluginConfig = async (config: Partial<PluginConfig>) => {
    if (pluginConfig) {
      const newConfig = { ...pluginConfig, ...config } as PluginConfig;
      updatePluginConfigMutation.mutate(newConfig);
    }
  };

  const uploadPluginMutation = useMutation({
    mutationFn: (data: { filename: string; content: string }) =>
      api('/api/plugins/upload', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      showSuccess('插件已上传。');
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
    onError: (error) => {
      showError((error as Error).message);
    }
  });

  const uploadPlugin = async (filename: string, content: string) => {
    uploadPluginMutation.mutate({ filename, content });
  };

  const loadPluginSource = async (id: string) => {
    const data = await api<{ source: string; filename: string }>(`/api/plugins/${id}/source`);
    return data;
  };

  const savePluginSourceMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      api(`/api/plugins/${id}/source`, { method: 'PUT', body: JSON.stringify({ content }) }),
    onSuccess: () => {
      showSuccess('插件源码已保存。');
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
    onError: (error) => {
      showError((error as Error).message);
    }
  });

  const savePluginSource = async (id: string, content: string) => {
    savePluginSourceMutation.mutate({ id, content });
  };

  const createOpenApiTokenMutation = useMutation({
    mutationFn: (name: string) =>
      api<{ token: string; name: string }>('/api/openapi/tokens', { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: (created) => {
      setNewTokenName('');
      queryClient.invalidateQueries({ queryKey: ['openApi'] });
      showSuccess(`OpenAPI Token 已创建。Token: ${created.token}（请立即保存，此值仅显示一次）`);
    },
    onError: (error) => {
      showError((error as Error).message);
    }
  });

  const createOpenApiToken = async () => {
    if (!newTokenName.trim()) {
      showError('请输入 Token 名称。');
      return;
    }
    createOpenApiTokenMutation.mutate(newTokenName);
  };

  const toggleOpenApiTokenMutation = useMutation({
    mutationFn: (tokenId: string) =>
      api(`/api/openapi/tokens/${tokenId}/toggle`, { method: 'POST' }),
    onSuccess: () => {
      showSuccess('OpenAPI Token 状态已更新。');
      queryClient.invalidateQueries({ queryKey: ['openApi'] });
    },
    onError: (error) => {
      showError((error as Error).message);
    }
  });

  const toggleOpenApiToken = async (tokenId: string) => {
    toggleOpenApiTokenMutation.mutate(tokenId);
  };

  const deleteOpenApiTokenMutation = useMutation({
    mutationFn: (tokenId: string) =>
      api(`/api/openapi/tokens/${tokenId}`, { method: 'DELETE' }),
    onSuccess: () => {
      showSuccess('OpenAPI Token 已删除。');
      queryClient.invalidateQueries({ queryKey: ['openApi'] });
    },
    onError: (error) => {
      showError((error as Error).message);
    }
  });

  const deleteOpenApiToken = async (tokenId: string) => {
    deleteOpenApiTokenMutation.mutate(tokenId);
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

  // 检查是否有任何mutation正在加载
  const isMutating = createAccountMutation.isPending ||
    createOneBotAccountMutation.isPending ||
    createOneBotTokenMutation.isPending ||
    toggleAccountMutation.isPending ||
    sendMessageMutation.isPending ||
    connectPlatformMutation.isPending ||
    disconnectPlatformMutation.isPending ||
    saveConfigMutation.isPending ||
    togglePluginMutation.isPending ||
    reloadPluginMutation.isPending ||
    deletePluginMutation.isPending ||
    updatePluginConfigMutation.isPending ||
    uploadPluginMutation.isPending ||
    savePluginSourceMutation.isPending ||
    createOpenApiTokenMutation.isPending ||
    toggleOpenApiTokenMutation.isPending ||
    deleteOpenApiTokenMutation.isPending;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* 桌面端侧边栏 */}
      <Sidebar>
        <SidebarHeader>
          <span className="text-2xl transition-transform duration-300 ease-in-out hover:scale-110">🤖</span>
          <span className="font-semibold text-lg transition-all duration-300 ease-in-out">{config?.webName || 'Wawa-QQbot'}</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav>
            {menuItems.map((item) => (
              <SidebarNavItem
                key={item.key}
                active={activeMenu === item.key}
                icon={getMenuIcon(item.key)}
                onClick={() => setActiveMenu(item.key)}
              >
                {item.label}
              </SidebarNavItem>
            ))}
          </SidebarNav>
        </SidebarContent>
      </Sidebar>

      <main className="flex-1 flex flex-col overflow-hidden h-full pb-[calc(4rem+env(safe-area-inset-bottom,0))] md:pb-0">
        {/* 桌面端头部 */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b bg-card shrink-0 shadow-sm transition-all duration-300 ease-in-out">
          <h1 className="text-xl font-semibold transition-all duration-300 ease-in-out">{config?.webName || 'Wawa-QQbot 控制台'}</h1>
          <div className="flex items-center gap-5">
            <ThemeToggle />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/70 transition-all duration-200 ease-in-out">
              <span className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ease-in-out ${platformStatus?.connected ? 'bg-green-500 scale-110' : platformStatus?.connecting ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`}></span>
              <span className="text-sm font-medium text-muted-foreground transition-all duration-200 ease-in-out">
                {platformStatus?.connected ? '已连接' : platformStatus?.connecting ? '连接中' : '未连接'}
              </span>
            </div>
            {user && (
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-all duration-200 ease-in-out">
                <span className="text-sm font-medium text-foreground">
                  {user.username}
                  <span className="ml-1.5 text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                    {user.role === 'admin' ? '管理员' : '用户'}
                  </span>
                </span>
                <button
                  onClick={logout}
                  className="text-sm font-medium text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-all duration-200 ease-in-out"
                >
                  退出登录
                </button>
              </div>
            )}
          </div>
        </header>

        {/* 移动端头部 */}
        <MobileHeader
          title={config?.webName || 'Wawa-QQbot'}
          platformStatus={platformStatus || { connected: false, connecting: false }}
          user={user}
          onLogout={logout}
        />

        {/* 移动端状态指示栏 */}
        <div className="md:hidden flex items-center justify-between px-4 py-2 bg-muted/30 border-b text-xs transition-all duration-300 ease-in-out">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ease-in-out ${platformStatus?.connected ? 'bg-green-500 scale-110' : platformStatus?.connecting ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`}></span>
            <span className="text-foreground font-medium">
              {platformStatus?.connected ? '已连接' : platformStatus?.connecting ? '连接中' : '未连接'}
            </span>
          </div>
          <ThemeToggle />
        </div>

        {(isMutating || notice || config?.notice) && (
          <div className={cn(
            "px-4 md:px-8 py-3 md:py-4 border-b transition-all duration-300 ease-in-out",
            isMutating ? "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800" :
            noticeSeverity === 'error' ? "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800" :
            noticeSeverity === 'success' ? "bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800" :
            "bg-muted/50"
          )}>
            <p className={cn(
              "text-sm md:text-base truncate flex items-center gap-2",
              isMutating ? "text-blue-700 dark:text-blue-300" :
              noticeSeverity === 'error' ? "text-red-700 dark:text-red-300" :
              noticeSeverity === 'success' ? "text-green-700 dark:text-green-300" :
              "text-foreground"
            )}>
              {isMutating && <span className="animate-spin">⏳</span>}
              {noticeSeverity === 'error' && <span>❌</span>}
              {noticeSeverity === 'success' && <span>✅</span>}
              {isMutating ? '处理中，请稍候...' : notice || config?.notice}
            </p>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-auto p-4 md:p-6 lg:p-8 transition-all duration-300 ease-in-out">
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="flex items-center gap-3">
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
                <span>加载中...</span>
              </div>
            </div>
          }>
            {activeMenu === 'home' && (
              <HomePage
                accounts={accounts}
                platformStatus={platformStatus || { connected: false, connecting: false, connectedAccountId: null, connectedAccountName: null, lastConnectedAt: null, tokenExpiresAt: null, lastError: null }}
                snapshot={snapshot}
                plugins={plugins}
                config={config || { webName: 'Wawa-QQbot', notice: '欢迎使用 Wawa-QQbot 智能机器人管理平台', allowOpenApi: false, defaultIntent: 0, pluginPermissions: {}, updatedAt: new Date().toISOString() }}
                onNavigate={setActiveMenu}
              />
            )}

            {activeMenu === 'accounts' && (
              <AccountsPanel
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                newAccount={newAccount}
                newOneBotAccount={newOneBotAccount}
                onNewAccountChange={setNewAccount}
                onNewOneBotAccountChange={setNewOneBotAccount}
                onCreateAccount={createAccount}
                onCreateOneBotAccount={createOneBotAccount}
                onSelectAccount={setSelectedAccountId}
                onToggleAccount={toggleAccount}
              />
            )}

            {activeMenu === 'chat' && (
              <ChatPanel
                accounts={accounts}
                platformStatus={platformStatus || { connected: false, connecting: false, connectedAccountId: null, connectedAccountName: null, lastConnectedAt: null, tokenExpiresAt: null, lastError: null }}
              />
            )}

            {activeMenu === 'platform' && (
              <PlatformPanel
                platformStatus={platformStatus || { connected: false, connecting: false, connectedAccountId: null, connectedAccountName: null, lastConnectedAt: null, tokenExpiresAt: null, lastError: null }}
                platformLogs={platformLogs}
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                oneBotStatus={oneBotStatus || null}
                oneBotConnections={oneBotConnections}
                tokenName={newOneBotTokenName}
                createdToken={createdOneBotToken}
                onTokenNameChange={setNewOneBotTokenName}
                onCreateToken={createOneBotToken}
                onConnect={connectPlatform}
                onDisconnect={disconnectPlatform}
                onRefresh={() => {
                  queryClient.invalidateQueries({ queryKey: ['platformStatus'] });
                  queryClient.invalidateQueries({ queryKey: ['platformLogs'] });
                  queryClient.invalidateQueries({ queryKey: ['oneBotStatus'] });
                  queryClient.invalidateQueries({ queryKey: ['oneBotConnections'] });
                }}
              />
            )}

            {activeMenu === 'config' && config && <ConfigPanel config={config} onChange={(newConfig) => {}} onSave={saveConfig} />}

            {activeMenu === 'logs' && (
            <LogsPanel
              logs={logs}
              logType={logType}
              onChangeType={(next: 'all' | 'framework' | 'plugin' | 'openapi' | 'config') => {
                setLogType(next);
              }}
              onRefresh={() => {
                queryClient.invalidateQueries({ queryKey: ['logs', logType] });
              }}
            />
          )}

            {activeMenu === 'statistics' && (
              <StatisticsPanel snapshot={snapshot} onRefresh={() => {
                queryClient.invalidateQueries({ queryKey: ['statistics'] });
              }} />
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
                onRefresh={() => {
                  queryClient.invalidateQueries({ queryKey: ['openApi'] });
                }}
              />
            )}

            {activeMenu === 'plugins' && (
              <PluginsPanel
                plugins={plugins}
                pluginConfig={pluginConfig || null}
                onTogglePlugin={togglePlugin}
                onReloadPlugin={reloadPlugin}
                onDeletePlugin={deletePlugin}
                onUpdateConfig={updatePluginConfig}
                onUploadPlugin={uploadPlugin}
                onLoadPluginSource={loadPluginSource}
                onSavePluginSource={savePluginSource}
              />
            )}
          </Suspense>
        </div>
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
            className="absolute bottom-[calc(4rem+env(safe-area-inset-bottom,0))] left-0 right-0 bg-card border-t rounded-t-2xl p-5 animate-slide-up-modal shadow-2xl shadow-black/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-4 gap-5">
              {menuItems.filter(item => !['home', 'chat', 'platform', 'plugins'].includes(item.key)).map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setActiveMenu(item.key);
                    setShowMoreMenu(false);
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted active:scale-95 transition-all duration-200 ease-in-out"
                >
                  <span className="text-2xl transition-transform duration-200 ease-in-out hover:scale-110">{getMenuIcon(item.key)}</span>
                  <span className="text-xs font-medium text-muted-foreground transition-all duration-200 ease-in-out">{item.label}</span>
                </button>
              ))}
            </div>
            {/* 用户信息和退出按钮 */}
            {user && (
              <div className="mt-5 pt-5 border-t flex items-center justify-between transition-all duration-200 ease-in-out">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{user.username}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                    {user.role === 'admin' ? '管理员' : '用户'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setShowMoreMenu(false);
                  }}
                  className="text-sm font-medium text-destructive hover:bg-destructive/10 px-4 py-2 rounded-lg transition-all duration-200 ease-in-out"
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
