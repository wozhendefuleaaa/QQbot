import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  AppConfig,
  BotAccount,
  ChatMessage,
  Conversation,
  OpenApiTokenView,
  PlatformLog,
  PlatformStatus,
  PluginInfo,
  StatisticsSnapshot,
  SystemLog,
  QuickReply
} from '../types';

// Query Keys
export const queryKeys = {
  accounts: ['accounts'] as const,
  conversations: (accountId: string) => ['conversations', accountId] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
  platformStatus: ['platformStatus'] as const,
  platformLogs: ['platformLogs'] as const,
  config: ['config'] as const,
  logs: (type: string) => ['logs', type] as const,
  statistics: ['statistics'] as const,
  plugins: ['plugins'] as const,
  openApiTokens: ['openApiTokens'] as const,
  quickReplies: ['quickReplies'] as const,
};

// 账号相关 hooks
export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: () => api<{ items: BotAccount[] }>('/api/accounts'),
    select: (data) => data.items,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (account: { name: string; appId: string; appSecret: string }) =>
      api<BotAccount>('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(account),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

export function useToggleAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ accountId, action }: { accountId: string; action: 'start' | 'stop' }) =>
      api(`/api/accounts/${accountId}/${action}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

// 会话相关 hooks
export function useConversations(accountId: string | null) {
  return useQuery({
    queryKey: queryKeys.conversations(accountId || 'all'),
    queryFn: () => {
      if (!accountId) return { items: [] };
      return api<{ items: Conversation[] }>(`/api/conversations?accountId=${accountId}`);
    },
    enabled: !!accountId,
    select: (data) => data.items,
  });
}

// 消息相关 hooks
export function useMessages(conversationId: string | null, limit = 50, before?: string) {
  return useQuery({
    queryKey: [...queryKeys.messages(conversationId || ''), { limit, before }],
    queryFn: () => {
      if (!conversationId) return { items: [], hasMore: false };
      const params = new URLSearchParams({ limit: String(limit) });
      if (before) params.set('before', before);
      return api<{ items: ChatMessage[]; hasMore: boolean }>(
        `/api/conversations/${conversationId}/messages?${params}`
      );
    },
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: {
      accountId: string;
      targetType: 'user' | 'group';
      targetId: string;
      text: string;
    }) =>
      api<{ accepted: boolean; messageId: string; conversationId: string; messageStatus?: 'sent' | 'failed' }>(
        '/api/messages/send',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations(variables.accountId) });
    },
  });
}

// 平台状态 hooks
export function usePlatformStatus() {
  return useQuery({
    queryKey: queryKeys.platformStatus,
    queryFn: () => api<PlatformStatus>('/api/platform/status'),
    refetchInterval: 5000,
  });
}

export function usePlatformLogs(limit = 100) {
  return useQuery({
    queryKey: queryKeys.platformLogs,
    queryFn: () => api<{ items: PlatformLog[] }>(`/api/platform/logs?limit=${limit}`),
    select: (data) => data.items,
    refetchInterval: 5000,
  });
}

export function useConnectPlatform() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (accountId: string) =>
      api('/api/platform/connect', {
        method: 'POST',
        body: JSON.stringify({ accountId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platformStatus });
      queryClient.invalidateQueries({ queryKey: queryKeys.platformLogs });
    },
  });
}

export function useDisconnectPlatform() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () =>
      api('/api/platform/disconnect', { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platformStatus });
      queryClient.invalidateQueries({ queryKey: queryKeys.platformLogs });
    },
  });
}

// 配置 hooks
export function useConfig() {
  return useQuery({
    queryKey: queryKeys.config,
    queryFn: () => api<AppConfig>('/api/config'),
  });
}

export function useSaveConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (config: AppConfig) =>
      api('/api/config', { method: 'POST', body: JSON.stringify(config) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config });
    },
  });
}

// 日志 hooks
export function useLogs(type: 'all' | 'framework' | 'plugin' | 'openapi' | 'config' = 'all', limit = 200) {
  return useQuery({
    queryKey: queryKeys.logs(type),
    queryFn: () => api<{ items: SystemLog[] }>(`/api/logs?type=${type}&limit=${limit}`),
    select: (data) => data.items,
    refetchInterval: 5000,
  });
}

// 统计 hooks
export function useStatistics() {
  return useQuery({
    queryKey: queryKeys.statistics,
    queryFn: () => api<{ snapshot: StatisticsSnapshot }>('/api/statistics'),
    select: (data) => data.snapshot,
    refetchInterval: 5000,
  });
}

// 插件 hooks
export function usePlugins() {
  return useQuery({
    queryKey: queryKeys.plugins,
    queryFn: () => api<{ items: PluginInfo[] }>('/api/plugins'),
    select: (data) => data.items,
  });
}

export function useCreatePlugin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (plugin: { name: string; description: string; version: string }) =>
      api('/api/plugins', { method: 'POST', body: JSON.stringify(plugin) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plugins });
    },
  });
}

export function useTogglePlugin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (pluginId: string) =>
      api(`/api/plugins/${pluginId}/toggle`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plugins });
    },
  });
}

// OpenAPI hooks
export function useOpenApiTokens() {
  return useQuery({
    queryKey: queryKeys.openApiTokens,
    queryFn: () => api<{ enabled: boolean; items: OpenApiTokenView[] }>('/api/openapi/tokens'),
  });
}

export function useCreateOpenApiToken() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (name: string) =>
      api<{ token: string; name: string }>('/api/openapi/tokens', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.openApiTokens });
    },
  });
}

export function useToggleOpenApiToken() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (tokenId: string) =>
      api(`/api/openapi/tokens/${tokenId}/toggle`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.openApiTokens });
    },
  });
}

// 快捷回复 hooks
export function useQuickReplies() {
  return useQuery({
    queryKey: queryKeys.quickReplies,
    queryFn: () => api<{ items: QuickReply[] }>('/api/quick-replies'),
    select: (data) => data.items,
  });
}
