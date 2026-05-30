import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { OpenApiTokenView } from '../types';
import { api } from '../services/api';

export function useOpenApi() {
  const queryClient = useQueryClient();

  const { data: openApiData } = useQuery({
    queryKey: ['openApi'],
    queryFn: () => api<{ enabled: boolean; items: OpenApiTokenView[] }>('/api/openapi/tokens'),
    refetchInterval: 30000,
  });

  const openApiTokens = openApiData?.items || [];

  const createOpenApiTokenMutation = useMutation({
    mutationFn: (name: string) => api<{ token: string }>('/api/openapi/tokens', { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openApi'] });
    },
  });

  const toggleOpenApiTokenMutation = useMutation({
    mutationFn: (tokenId: string) => api(`/api/openapi/tokens/${tokenId}/toggle`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openApi'] });
    },
  });

  const deleteOpenApiTokenMutation = useMutation({
    mutationFn: (tokenId: string) => api(`/api/openapi/tokens/${tokenId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openApi'] });
    },
  });

  return {
    openApiTokens,
    createOpenApiTokenMutation,
    toggleOpenApiTokenMutation,
    deleteOpenApiTokenMutation,
  };
}