import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PluginInfo, PluginConfig } from '../types';
import { api } from '../services/api';

export function usePlugins() {
  const queryClient = useQueryClient();

  const { data: pluginsData } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => api<{ items: PluginInfo[] }>('/api/plugins'),
    refetchInterval: false,
  });

  const plugins = pluginsData?.items || [];

  const { data: pluginConfig } = useQuery({
    queryKey: ['pluginConfig'],
    queryFn: () => api<PluginConfig>('/api/plugins/config'),
  });

  const togglePluginMutation = useMutation({
    mutationFn: (pluginId: string) => api(`/api/plugins/${pluginId}/toggle`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plugins'] }),
  });

  const reloadPluginMutation = useMutation({
    mutationFn: (pluginId: string) => api(`/api/plugins/${pluginId}/reload`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plugins'] }),
  });

  const deletePluginMutation = useMutation({
    mutationFn: (pluginId: string) => api(`/api/plugins/${pluginId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plugins'] }),
  });

  const uploadPluginMutation = useMutation({
    mutationFn: (data: { filename: string; content: string }) =>
      api('/api/plugins/upload', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plugins'] }),
  });

  const savePluginSourceMutation = useMutation({
    mutationFn: (data: { pluginId: string; content: string }) =>
      api(`/api/plugins/${data.pluginId}/source`, { method: 'PUT', body: JSON.stringify({ content: data.content }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plugins'] }),
  });

  return {
    plugins,
    pluginConfig: pluginConfig || null,
    togglePluginMutation,
    reloadPluginMutation,
    deletePluginMutation,
    uploadPluginMutation,
    savePluginSourceMutation,
  };
}