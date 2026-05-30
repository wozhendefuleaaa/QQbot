import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSSE } from './useSSE';

export function useSseEvents() {
  const queryClient = useQueryClient();

  const handleAccountUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
  }, [queryClient]);

  const handlePluginStatus = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['plugins'] });
  }, [queryClient]);

  const handleConfigChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['config'] });
  }, [queryClient]);

  const handleStatisticsUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['statistics'] });
  }, [queryClient]);

  const events = useMemo(
    () => ({
      account_update: handleAccountUpdate,
      plugin_status: handlePluginStatus,
      config_change: handleConfigChange,
      statistics_update: handleStatisticsUpdate,
    }),
    [handleAccountUpdate, handlePluginStatus, handleConfigChange, handleStatisticsUpdate]
  );

  const { connected, error } = useSSE({
    url: '/api/sse/events',
    events,
  });

  return { connected, error };
}