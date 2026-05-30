import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './contexts/AuthContext';
import { useAccounts } from './hooks/useAccounts';
import { usePlatform } from './hooks/usePlatform';
import { usePlugins } from './hooks/usePlugins';
import { useOpenApi } from './hooks/useOpenApi';
import { useConfig } from './hooks/useConfig';
import { useStatistics } from './hooks/useStatistics';
import { useLogs } from './hooks/useLogs';
import { useSseEvents } from './hooks/useSseEvents';
import { LoginPage } from './modules/auth/LoginPage';
import { ChangePasswordDialog } from './modules/auth/ChangePasswordDialog';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import {
  HomePageSkeleton,
  AccountsPanelSkeleton,
  ChatPanelSkeleton,
  PlatformPanelSkeleton,
  ConfigPanelSkeleton,
  LogsPanelSkeleton,
  StatisticsPanelSkeleton,
  PluginsPanelSkeleton,
  GenericSkeleton,
} from './components/ui/skeleton';
import type { MenuKey } from './types';

const HomePage = React.lazy(() => import('./modules/home/HomePage').then((m) => ({ default: m.HomePage })));
const AccountsPanel = React.lazy(() => import('./modules/accounts/AccountsPanel').then((m) => ({ default: m.AccountsPanel })));
const ChatPanel = React.lazy(() => import('./modules/chat/ChatPanel').then((m) => ({ default: m.ChatPanel })));
const PlatformPanel = React.lazy(() => import('./modules/platform/PlatformPanel').then((m) => ({ default: m.PlatformPanel })));
const ConfigPanel = React.lazy(() => import('./modules/config/ConfigPanel').then((m) => ({ default: m.ConfigPanel })));
const LogsPanel = React.lazy(() => import('./modules/logs/LogsPanel').then((m) => ({ default: m.LogsPanel })));
const StatisticsPanel = React.lazy(() => import('./modules/statistics/StatisticsPanel').then((m) => ({ default: m.StatisticsPanel })));
const OpenApiPanel = React.lazy(() => import('./modules/openapi/OpenApiPanel').then((m) => ({ default: m.OpenApiPanel })));
const PluginsPanel = React.lazy(() => import('./modules/plugins/PluginsPanel').then((m) => ({ default: m.PluginsPanel })));

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-3">
        <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>加载中...</span>
      </div>
    </div>
  );
}

function App() {
  const { isAuthenticated, isLoading, user, logout, requirePasswordChange, clearRequirePasswordChange } = useAuth();
  const queryClient = useQueryClient();

  const [activeMenu, setActiveMenu] = useState<MenuKey>('home');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const { accounts, toggleAccountMutation } = useAccounts();
  const {
    platformStatus, platformLogs, oneBotStatus, oneBotConnections,
    connectPlatformMutation, disconnectPlatformMutation, refreshPlatform,
  } = usePlatform();
  const { config, saveConfigMutation } = useConfig();
  const { plugins, pluginConfig, togglePluginMutation, reloadPluginMutation, deletePluginMutation, uploadPluginMutation, savePluginSourceMutation } = usePlugins();
  const { openApiTokens, toggleOpenApiTokenMutation, deleteOpenApiTokenMutation } = useOpenApi();
  const statistics = useStatistics();
  const { logs } = useLogs();
  useSseEvents();

  const mutations = useMemo(() => [
    toggleAccountMutation,
    connectPlatformMutation, disconnectPlatformMutation,
    saveConfigMutation, togglePluginMutation, reloadPluginMutation,
    deletePluginMutation, uploadPluginMutation, savePluginSourceMutation,
    toggleOpenApiTokenMutation, deleteOpenApiTokenMutation,
  ], [
    toggleAccountMutation, connectPlatformMutation, disconnectPlatformMutation,
    saveConfigMutation, togglePluginMutation, reloadPluginMutation,
    deletePluginMutation, uploadPluginMutation, savePluginSourceMutation,
    toggleOpenApiTokenMutation, deleteOpenApiTokenMutation,
  ]);

  const isMutating = mutations.some((m) => m.isPending);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) setSelectedAccountId(accounts[0].id);
  }, [accounts, selectedAccountId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  if (requirePasswordChange) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <ChangePasswordDialog onSuccess={clearRequirePasswordChange} />
      </div>
    );
  }

  const skeletonMap = useMemo<Record<MenuKey, React.ReactNode>>(() => ({
    home: <HomePageSkeleton />,
    accounts: <AccountsPanelSkeleton />,
    chat: <ChatPanelSkeleton />,
    platform: <PlatformPanelSkeleton />,
    config: <ConfigPanelSkeleton />,
    logs: <LogsPanelSkeleton />,
    statistics: <StatisticsPanelSkeleton />,
    openapi: <GenericSkeleton />,
    plugins: <PluginsPanelSkeleton />,
  }), []);

  const renderPage = useMemo(() => {
    const defaultConfig = { webName: 'Wawa-QQbot', notice: '欢迎使用 Wawa-QQbot 智能机器人管理平台', allowOpenApi: false, defaultIntent: 0, pluginPermissions: {}, updatedAt: new Date().toISOString() };

    switch (activeMenu) {
      case 'home':
        return <HomePage accounts={accounts} platformStatus={platformStatus} snapshot={statistics} plugins={plugins} config={config || defaultConfig} onNavigate={setActiveMenu} />;
      case 'accounts':
        return <AccountsPanel accounts={accounts} selectedAccountId={selectedAccountId} newAccount={{ name: '', appId: '', appSecret: '' }} newOneBotAccount={{ name: '', selfId: '' }} onNewAccountChange={() => {}} onNewOneBotAccountChange={() => {}} onCreateAccount={() => {}} onCreateOneBotAccount={() => {}} onSelectAccount={setSelectedAccountId} onToggleAccount={(a) => toggleAccountMutation.mutate({ accountId: a.id, action: a.status === 'ONLINE' ? 'stop' : 'start' })} />;
      case 'chat':
        return <ChatPanel accounts={accounts} platformStatus={platformStatus} />;
      case 'platform':
        return <PlatformPanel platformStatus={platformStatus} platformLogs={platformLogs} accounts={accounts} selectedAccountId={selectedAccountId} oneBotStatus={oneBotStatus || null} oneBotConnections={oneBotConnections} tokenName="" createdToken={null} onTokenNameChange={() => {}} onCreateToken={() => {}} onConnect={() => selectedAccountId && connectPlatformMutation.mutate(selectedAccountId)} onDisconnect={() => disconnectPlatformMutation.mutate()} onRefresh={refreshPlatform} />;
      case 'config':
        return config ? <ConfigPanel config={config} onChange={() => {}} onSave={() => saveConfigMutation.mutate(config)} /> : null;
      case 'logs':
        return <LogsPanel logs={logs} logType="all" onChangeType={() => {}} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['logs'] })} />;
      case 'statistics':
        return <StatisticsPanel snapshot={statistics} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['statistics'] })} />;
      case 'openapi':
        return <OpenApiPanel enabled={true} tokens={openApiTokens} newTokenName="" onTokenNameChange={() => {}} onCreateToken={() => {}} onToggleToken={(id: string) => toggleOpenApiTokenMutation.mutate(id)} onDeleteToken={(id: string) => deleteOpenApiTokenMutation.mutate(id)} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['openApi'] })} />;
      case 'plugins':
        return <PluginsPanel plugins={plugins} pluginConfig={pluginConfig} onTogglePlugin={async (id: string) => { togglePluginMutation.mutate(id); }} onReloadPlugin={async (id: string) => { reloadPluginMutation.mutate(id); }} onDeletePlugin={async (id: string) => { deletePluginMutation.mutate(id); }} onUpdateConfig={async () => {}} onUploadPlugin={async (f: string, c: string) => { uploadPluginMutation.mutate({ filename: f, content: c }); }} onLoadPluginSource={async () => ({ source: '', filename: '' })} onSavePluginSource={async (id: string, c: string) => { savePluginSourceMutation.mutate({ pluginId: id, content: c }); }} />;
      default:
        return null;
    }
  }, [activeMenu, accounts, platformStatus, statistics, plugins, config, selectedAccountId, platformLogs, oneBotStatus, oneBotConnections, logs, openApiTokens, pluginConfig, toggleAccountMutation, connectPlatformMutation, disconnectPlatformMutation, saveConfigMutation, togglePluginMutation, reloadPluginMutation, deletePluginMutation, uploadPluginMutation, savePluginSourceMutation, toggleOpenApiTokenMutation, deleteOpenApiTokenMutation, refreshPlatform, queryClient]);

  return (
    <ErrorBoundary>
      <AppShell
        activeMenu={activeMenu}
        onMenuChange={setActiveMenu}
        platformStatus={platformStatus}
        isMutating={isMutating}
        user={user}
        onLogout={logout}
        showMoreMenu={showMoreMenu}
        onToggleMoreMenu={() => setShowMoreMenu(!showMoreMenu)}
      >
        <Suspense fallback={skeletonMap[activeMenu] || <LoadingSpinner />}>
          {renderPage}
        </Suspense>
      </AppShell>
      <Toaster richColors closeButton position="top-center" />
    </ErrorBoundary>
  );
}

export default App;