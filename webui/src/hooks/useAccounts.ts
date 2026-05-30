import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BotAccount, OneBotCreateTokenResponse } from '../types';
import { api } from '../services/api';

export function useAccounts() {
  const queryClient = useQueryClient();

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api<{ items: BotAccount[] }>('/api/accounts'),
    refetchInterval: false,
  });

  const accounts = accountsData?.items || [];

  const createAccountMutation = useMutation({
    mutationFn: (account: { name: string; appId: string; appSecret: string }) =>
      api<BotAccount>('/api/accounts', { method: 'POST', body: JSON.stringify(account) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const createOneBotAccountMutation = useMutation({
    mutationFn: (account: { name: string; selfId: string }) =>
      api<BotAccount>('/api/onebot/accounts', { method: 'POST', body: JSON.stringify(account) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const createOneBotTokenMutation = useMutation({
    mutationFn: (data: { accountId: string; name: string }) =>
      api<OneBotCreateTokenResponse>('/api/onebot/tokens', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oneBotStatus'] });
      queryClient.invalidateQueries({ queryKey: ['oneBotConnections'] });
    },
  });

  const toggleAccountMutation = useMutation({
    mutationFn: ({ accountId, action }: { accountId: string; action: string }) =>
      api(`/api/accounts/${accountId}/${action}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['oneBotStatus'] });
      queryClient.invalidateQueries({ queryKey: ['oneBotConnections'] });
    },
  });

  return {
    accounts,
    createAccountMutation,
    createOneBotAccountMutation,
    createOneBotTokenMutation,
    toggleAccountMutation,
  };
}