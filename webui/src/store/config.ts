import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConfigState {
  config: any;
  loading: boolean;
  error: string | null;
  setConfig: (config: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadConfig: () => Promise<void>;
  saveConfig: (config: any) => Promise<void>;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      config: {},
      loading: false,
      error: null,
      setConfig: (config) => set({ config }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      loadConfig: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/config');
          if (!response.ok) throw new Error('Failed to load config');
          const data = await response.json();
          set({ config: data, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
      saveConfig: async (config) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(config),
          });
          if (!response.ok) throw new Error('Failed to save config');
          set({ config, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
    }),
    {
      name: 'config-storage',
    }
  )
);
