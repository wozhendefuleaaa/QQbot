import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatState {
  conversations: any[];
  messages: any[];
  selectedConversationId: string | null;
  loading: boolean;
  error: string | null;
  setConversations: (conversations: any[]) => void;
  setMessages: (messages: any[]) => void;
  setSelectedConversationId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadConversations: (accountId: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      messages: [],
      selectedConversationId: null,
      loading: false,
      error: null,
      setConversations: (conversations) => set({ conversations }),
      setMessages: (messages) => set({ messages }),
      setSelectedConversationId: (id) => set({ selectedConversationId: id }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      loadConversations: async (accountId) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/conversations?accountId=${accountId}`);
          if (!response.ok) throw new Error('Failed to load conversations');
          const data = await response.json();
          set({ conversations: data.items || data, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
      loadMessages: async (conversationId) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/conversations/${conversationId}/messages`);
          if (!response.ok) throw new Error('Failed to load messages');
          const data = await response.json();
          set({ messages: data.items || data, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
    }),
    {
      name: 'chat-storage',
    }
  )
);
