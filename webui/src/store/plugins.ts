import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PluginsState {
  plugins: any[];
  pluginConfig: any;
  openApiEnabled: boolean;
  openApiTokens: any[];
  newTokenName: string;
  loading: boolean;
  error: string | null;
  setPlugins: (plugins: any[]) => void;
  setPluginConfig: (config: any) => void;
  setOpenApiEnabled: (enabled: boolean) => void;
  setOpenApiTokens: (tokens: any[]) => void;
  setNewTokenName: (name: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadPlugins: () => Promise<void>;
  loadOpenApi: () => Promise<void>;
  togglePlugin: (pluginId: string) => Promise<void>;
  updatePluginConfig: (config: any) => Promise<void>;
  createOpenApiToken: (name: string) => Promise<void>;
  toggleOpenApiToken: (tokenId: string) => Promise<void>;
  deleteOpenApiToken: (tokenId: string) => Promise<void>;
}

export const usePluginsStore = create<PluginsState>()(
  persist(
    (set, get) => ({
      plugins: [],
      pluginConfig: {},
      openApiEnabled: false,
      openApiTokens: [],
      newTokenName: '',
      loading: false,
      error: null,
      setPlugins: (plugins) => set({ plugins }),
      setPluginConfig: (config) => set({ pluginConfig: config }),
      setOpenApiEnabled: (enabled) => set({ openApiEnabled: enabled }),
      setOpenApiTokens: (tokens) => set({ openApiTokens: tokens }),
      setNewTokenName: (name) => set({ newTokenName: name }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      loadPlugins: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/plugins');
          if (!response.ok) throw new Error('Failed to load plugins');
          const data = await response.json();
          set({ plugins: data.items || data, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
      loadOpenApi: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/openapi/tokens');
          if (!response.ok) throw new Error('Failed to load OpenAPI config');
          const data = await response.json();
          set({ 
            openApiEnabled: data.enabled, 
            openApiTokens: data.items || data, 
            loading: false 
          });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
      togglePlugin: async (pluginId) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/plugins/toggle/${pluginId}`, {
            method: 'POST',
          });
          if (!response.ok) throw new Error('Failed to toggle plugin');
          const data = await response.json();
          set({ plugins: data.items || data, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
      updatePluginConfig: async (config) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/plugins/config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(config),
          });
          if (!response.ok) throw new Error('Failed to update plugin config');
          set({ pluginConfig: config, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
      createOpenApiToken: async (name) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/openapi/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
          });
          if (!response.ok) throw new Error('Failed to create OpenAPI token');
          const data = await response.json();
          set({ openApiTokens: data.items || data, newTokenName: '', loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
      toggleOpenApiToken: async (tokenId) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/openapi/token/${tokenId}/toggle`, {
            method: 'POST',
          });
          if (!response.ok) throw new Error('Failed to toggle OpenAPI token');
          const data = await response.json();
          set({ openApiTokens: data.items || data, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
      deleteOpenApiToken: async (tokenId) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/openapi/token/${tokenId}`, {
            method: 'DELETE',
          });
          if (!response.ok) throw new Error('Failed to delete OpenAPI token');
          const data = await response.json();
          set({ openApiTokens: data.items || data, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
    }),
    {
      name: 'plugins-storage',
    }
  )
);
