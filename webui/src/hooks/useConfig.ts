import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AppConfig } from '../types';
import { api } from '../services/api';

export function useConfig() {
  const queryClient = useQueryClient();

  const { data: configData } = useQuery({
    queryKey: ['config'],
    queryFn: () => api<AppConfig>('/api/config'),
  });

  const saveConfigMutation = useMutation({
    mutationFn: (config: Partial<AppConfig>) =>
      api('/api/config', { method: 'POST', body: JSON.stringify(config) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });

  return {
    config: configData,
    saveConfigMutation,
  };
}