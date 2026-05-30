import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Conversation, ChatMessage } from '../types';
import { api } from '../services/api';

export function useChat(selectedAccountId: string, selectedConversationId: string) {
  const queryClient = useQueryClient();

  const { data: conversationsData } = useQuery({
    queryKey: ['conversations', selectedAccountId],
    queryFn: () => api<{ items: Conversation[] }>(`/api/conversations?accountId=${selectedAccountId}`),
    enabled: !!selectedAccountId,
    refetchInterval: 15000,
  });

  const conversations = conversationsData?.items || [];

  const { data: messagesData } = useQuery({
    queryKey: ['messages', selectedConversationId],
    queryFn: () => api<{ items: ChatMessage[] }>(`/api/conversations/${selectedConversationId}/messages`),
    enabled: !!selectedConversationId,
    refetchInterval: 10000,
  });

  const messages = messagesData?.items || [];

  const sendMessageMutation = useMutation({
    mutationFn: (data: { accountId: string; targetType: 'user' | 'group'; targetId: string; text: string }) =>
      api<{ status: string }>('/api/messages/send', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ['platformLogs'] });
    },
  });

  return {
    conversations,
    messages,
    sendMessageMutation,
  };
}