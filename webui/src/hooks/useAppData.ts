import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import {
  BotAccount,
  Conversation,
  ChatMessage,
  PlatformStatus,
  PlatformLog,
  AppConfig,
  SystemLog,
  StatisticsSnapshot,
  PluginInfo,
  PluginConfig,
  OpenApiTokenView
} from '../types';
import { useAccountsStore, useChatStore, useConfigStore, usePlatformStore, usePluginsStore } from '../store';

export function useAppData(isAuthenticated: boolean, showError: (message: string) => void) {
  // 使用Zustand store
  const { 
    accounts, 
    selectedAccountId, 
    setSelectedAccountId, 
    newAccount, 
    setNewAccount, 
    loadAccounts 
  } = useAccountsStore();
  
  const { 
    conversations, 
    messages, 
    selectedConversationId, 
    setSelectedConversationId, 
    loadConversations, 
    loadMessages 
  } = useChatStore();
  
  const { 
    platformStatus, 
    platformLogs, 
    loadPlatformStatus, 
    loadPlatformLogs 
  } = usePlatformStore();
  
  const { 
    config, 
    setConfig, 
    loadConfig 
  } = useConfigStore();
  
  const { 
    plugins, 
    pluginConfig, 
    setPluginConfig, 
    openApiEnabled, 
    openApiTokens, 
    newTokenName, 
    setNewTokenName, 
    loadPlugins, 
    loadOpenApi 
  } = usePluginsStore();
  
  // 本地状态
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [logType, setLogType] = useState<'all' | 'framework' | 'plugin' | 'openapi' | 'config'>('all');
  const [snapshot, setSnapshot] = useState<StatisticsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendForm, setSendForm] = useState<{ targetType: 'user' | 'group'; targetId: string; text: string }>({
    targetType: 'user',
    targetId: '',
    text: ''
  });

  // 加载日志
  const loadLogs = useCallback(async (nextType = logType) => {
    const data = await api<{ items: SystemLog[] }>(`/api/logs?type=${nextType}&limit=200`);
    setLogs(data.items);
  }, [logType]);

  // 加载统计
  const loadStatistics = useCallback(async () => {
    const data = await api<{ snapshot: StatisticsSnapshot }>('/api/statistics');
    setSnapshot(data.snapshot);
  }, []);

  // 加载插件配置
  const loadPluginConfig = useCallback(async () => {
    const data = await api<PluginConfig>('/api/plugins/config');
    setPluginConfig(data);
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
  }, [isAuthenticated, loadAccounts, loadPlatformStatus, loadPlatformLogs, loadConfig, loadLogs, loadStatistics, loadPlugins, loadPluginConfig, loadOpenApi, showError]);

  useEffect(() => {
    if (!isAuthenticated || !selectedAccountId) return;
    loadConversations(selectedAccountId).catch((e: Error) => showError(e.message));
  }, [isAuthenticated, selectedAccountId, loadConversations, showError]);

  useEffect(() => {
    if (!isAuthenticated || !selectedConversationId) return;
    loadMessages(selectedConversationId).catch((e: Error) => showError(e.message));
  }, [isAuthenticated, selectedConversationId, loadMessages, showError]);

  return {
    // 状态
    accounts,
    selectedAccountId,
    conversations,
    selectedConversationId,
    messages,
    platformStatus,
    platformLogs,
    config,
    logs,
    logType,
    snapshot,
    plugins,
    pluginConfig,
    openApiEnabled,
    openApiTokens,
    newTokenName,
    loading,
    newAccount,
    sendForm,

    // 方法
    setSelectedAccountId,
    setSelectedConversationId,
    setLogType,
    setNewTokenName,
    setNewAccount,
    setSendForm,
    setConfig,
    setPluginConfig,

    // 加载方法
    loadAccounts,
    loadConversations,
    loadMessages,
    loadPlatformStatus,
    loadPlatformLogs,
    loadConfig,
    loadLogs,
    loadStatistics,
    loadPlugins,
    loadPluginConfig,
    loadOpenApi
  };
}
