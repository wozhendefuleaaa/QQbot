import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PlatformState {
  platformStatus: any;
  platformLogs: any[];
  loading: boolean;
  error: string | null;
  setPlatformStatus: (status: any) => void;
  setPlatformLogs: (logs: any[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadPlatformStatus: () => Promise<void>;
  loadPlatformLogs: () => Promise<void>;
  connectPlatform: (accountId: string) => Promise<void>;
  disconnectPlatform: () => Promise<void>;
}

export const usePlatformStore = create<PlatformState>()(
  persist(
    (set, get) => ({
      platformStatus: {},
      platformLogs: [],
      loading: false,
      error: null,
      setPlatformStatus: (status) => set({ platformStatus: status }),
      setPlatformLogs: (logs) => set({ platformLogs: logs }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      loadPlatformStatus: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/platform/status');
          if (!response.ok) throw new Error('Failed to load platform status');
          const data = await response.json();
          set({ platformStatus: data, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
      loadPlatformLogs: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/platform/logs?limit=100');
          if (!response.ok) throw new Error('Failed to load platform logs');
          const data = await response.json();
          set({ platformLogs: data.items || data, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
      connectPlatform: async (accountId) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/platform/connect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ accountId }),
          });
          if (!response.ok) throw new Error('Failed to connect platform');
          const data = await response.json();
          set({ platformStatus: data, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
      disconnectPlatform: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/platform/disconnect', {
            method: 'POST',
          });
          if (!response.ok) throw new Error('Failed to disconnect platform');
          const data = await response.json();
          set({ platformStatus: data, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
    }),
    {
      name: 'platform-storage',
    }
  )
);
