import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PlatformStatus, PlatformLog, OneBotStatusOverview, OneBotConnectionInfo } from '../types';
import { api } from '../services/api';

export function usePlatform() {
  const queryClient = useQueryClient();

  const { data: platformStatus } = useQuery({
    queryKey: ['platformStatus'],
    queryFn: () => api<PlatformStatus>('/api/platform/status'),
    refetchInterval: 5000,
  });

  const { data: platformLogsData } = useQuery({
    queryKey: ['platformLogs'],
    queryFn: () => api<{ items: PlatformLog[] }>('/api/platform/logs?limit=100'),
    refetchInterval: 10000,
  });

  const platformLogs = platformLogsData?.items || [];

  const { data: oneBotStatus } = useQuery({
    queryKey: ['oneBotStatus'],
    queryFn: () => api<OneBotStatusOverview>('/api/onebot/status'),
    refetchInterval: 5000,
  });

  const { data: oneBotConnectionsData } = useQuery({
    queryKey: ['oneBotConnections'],
    queryFn: () => api<{ items: OneBotConnectionInfo[] }>('/api/onebot/connections'),
    refetchInterval: 10000,
  });

  const oneBotConnections = oneBotConnectionsData?.items || [];

  const connectPlatformMutation = useMutation({
    mutationFn: (accountId: string) =>
      api('/api/platform/connect', { method: 'POST', body: JSON.stringify({ accountId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformStatus'] });
      queryClient.invalidateQueries({ queryKey: ['platformLogs'] });
    },
  });

  const disconnectPlatformMutation = useMutation({
    mutationFn: () => api('/api/platform/disconnect', { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformStatus'] });
      queryClient.invalidateQueries({ queryKey: ['platformLogs'] });
    },
  });

  return {
    platformStatus: platformStatus || { connected: false, connecting: false, connectedAccountId: null, connectedAccountName: null, lastConnectedAt: null, tokenExpiresAt: null, lastError: null },
    platformLogs,
    oneBotStatus,
    oneBotConnections,
    connectPlatformMutation,
    disconnectPlatformMutation,
    refreshPlatform: () => {
      queryClient.invalidateQueries({ queryKey: ['platformStatus'] });
      queryClient.invalidateQueries({ queryKey: ['platformLogs'] });
      queryClient.invalidateQueries({ queryKey: ['oneBotStatus'] });
      queryClient.invalidateQueries({ queryKey: ['oneBotConnections'] });
    },
  };
}