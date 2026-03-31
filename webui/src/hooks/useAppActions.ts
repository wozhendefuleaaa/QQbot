import { useCallback } from 'react';
import { api } from '../services/api';
import {
  BotAccount,
  PluginConfig
} from '../types';

export function useAppActions(
  showError: (message: string) => void,
  showSuccess: (message: string) => void,
  loadAccounts: () => Promise<void>,
  loadConversations: (accountId: string) => Promise<void>,
  loadMessages: (conversationId: string) => Promise<void>,
  loadPlatformStatus: () => Promise<void>,
  loadPlatformLogs: () => Promise<void>,
  loadConfig: () => Promise<void>,
  loadPlugins: () => Promise<void>,
  loadOpenApi: () => Promise<void>
) {
  const createAccount = useCallback(async (e: React.FormEvent, newAccount: { name: string; appId: string; appSecret: string }, setNewAccount: (account: { name: string; appId: string; appSecret: string }) => void, setSelectedAccountId: (id: string) => void) => {
    e.preventDefault();
    try {
      const created = await api<BotAccount>('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(newAccount)
      });
      showSuccess(`账号"${created.name}"已创建，请点击启动。`);
      setNewAccount({ name: '', appId: '', appSecret: '' });
      await loadAccounts();
      setSelectedAccountId(created.id);
    } catch (err) {
      showError((err as Error).message);
    }
  }, [showError, showSuccess, loadAccounts]);

  const toggleAccount = useCallback(async (account: BotAccount) => {
    const action = account.status === 'ONLINE' ? 'stop' : 'start';
    try {
      await api(`/api/accounts/${account.id}/${action}`, { method: 'POST' });
      await loadAccounts();
      showSuccess(`账号"${account.name}"已${action === 'start' ? '启动' : '停用'}。`);
    } catch (err) {
      showError((err as Error).message);
    }
  }, [showError, showSuccess, loadAccounts]);

  const sendMessage = useCallback(async (e: React.FormEvent, sendForm: { targetType: 'user' | 'group'; targetId: string; text: string }, selectedAccountId: string, setSendForm: (form: { targetType: 'user' | 'group'; targetId: string; text: string }) => void) => {
    e.preventDefault();
    if (!selectedAccountId) {
      showError('请先选择账号。');
      return;
    }

    try {
      const sendResult = await api<{ status: string }>('/api/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          accountId: selectedAccountId,
          targetType: sendForm.targetType,
          targetId: sendForm.targetId,
          text: sendForm.text
        })
      });
      showSuccess(`消息发送完成：${sendResult.status}`);
      setSendForm({ ...sendForm, text: '' });
      await loadConversations(selectedAccountId);
      await loadPlatformLogs();
    } catch (err) {
      showError((err as Error).message);
    }
  }, [showError, showSuccess, loadConversations, loadPlatformLogs]);

  const connectPlatform = useCallback(async (selectedAccountId: string) => {
    if (!selectedAccountId) {
      showError('请先在账号管理中选择账号。');
      return;
    }

    try {
      await api('/api/platform/connect', {
        method: 'POST',
        body: JSON.stringify({ accountId: selectedAccountId })
      });
      await Promise.all([loadPlatformStatus(), loadPlatformLogs()]);
      showSuccess('已触发连接 QQ 平台。');
    } catch (err) {
      showError((err as Error).message);
    }
  }, [showError, showSuccess, loadPlatformStatus, loadPlatformLogs]);

  const disconnectPlatform = useCallback(async () => {
    try {
      await api('/api/platform/disconnect', { method: 'POST', body: JSON.stringify({}) });
      await Promise.all([loadPlatformStatus(), loadPlatformLogs()]);
      showSuccess('已断开 QQ 平台连接。');
    } catch (err) {
      showError((err as Error).message);
    }
  }, [showError, showSuccess, loadPlatformStatus, loadPlatformLogs]);

  const saveConfig = useCallback(async (e: React.FormEvent, config: any) => {
    e.preventDefault();
    try {
      await api('/api/config', { method: 'POST', body: JSON.stringify(config) });
      await loadConfig();
      showSuccess('配置已保存。');
    } catch (err) {
      showError((err as Error).message);
    }
  }, [showError, showSuccess, loadConfig]);

  const togglePlugin = useCallback(async (pluginId: string) => {
    try {
      await api(`/api/plugins/${pluginId}/toggle`, { method: 'POST' });
      await loadPlugins();
      showSuccess('插件状态已更新。');
    } catch (err) {
      showError((err as Error).message);
    }
  }, [showError, showSuccess, loadPlugins]);

  const reloadPlugin = useCallback(async (pluginId: string) => {
    try {
      await api(`/api/plugins/${pluginId}/reload`, { method: 'POST' });
      await loadPlugins();
      showSuccess('插件已重新加载。');
    } catch (err) {
      showError((err as Error).message);
    }
  }, [showError, showSuccess, loadPlugins]);

  const deletePlugin = useCallback(async (pluginId: string) => {
    try {
      await api(`/api/plugins/${pluginId}`, { method: 'DELETE' });
      await loadPlugins();
      showSuccess('插件已删除。');
    } catch (err) {
      showError((err as Error).message);
    }
  }, [showError, showSuccess, loadPlugins]);

  const updatePluginConfig = useCallback(async (config: Partial<PluginConfig>, pluginConfig: PluginConfig | null, setPluginConfig: (config: PluginConfig | null) => void) => {
    try {
      const newConfig = { ...pluginConfig, ...config } as PluginConfig;
      await api('/api/plugins/config', { method: 'PUT', body: JSON.stringify(newConfig) });
      setPluginConfig(newConfig);
      showSuccess('插件配置已更新。');
    } catch (err) {
      showError((err as Error).message);
    }
  }, [showError, showSuccess]);

  const uploadPlugin = useCallback(async (filename: string, content: string) => {
    try {
      await api('/api/plugins/upload', { method: 'POST', body: JSON.stringify({ filename, content }) });
      await loadPlugins();
      showSuccess('插件已上传。');
    } catch (err) {
      showError((err as Error).message);
    }
  }, [showError, showSuccess, loadPlugins]);

  const loadPluginSource = useCallback(async (id: string) => {
    const data = await api<{ source: string; filename: string }>(`/api/plugins/${id}/source`);
    return data;
  }, []);

  const savePluginSource = useCallback(async (id: string, content: string) => {
    try {
      await api(`/api/plugins/${id}/source`, { method: 'PUT', body: JSON.stringify({ content }) });
      await loadPlugins();
      showSuccess('插件源码已保存。');
    } catch (err) {
      showError((err as Error).message);
    }
  }, [showError, showSuccess, loadPlugins]);

  const createOpenApiToken = useCallback(async (newTokenName: string, setNewTokenName: (name: string) => void) => {
    if (!newTokenName.trim()) {
      showError('请输入 Token 名称。');
      return;
    }
    try {
      const created = await api<{ token: string; name: string }>('/api/openapi/tokens', { method: 'POST', body: JSON.stringify({ name: newTokenName }) });
      setNewTokenName('');
      await loadOpenApi();
      showSuccess(`OpenAPI Token 已创建。Token: ${created.token}（请立即保存，此值仅显示一次）`);
    } catch (err) {
      showError((err as Error).message);
    }
  }, [showError, showSuccess, loadOpenApi]);

  const toggleOpenApiToken = useCallback(async (tokenId: string) => {
    try {
      await api(`/api/openapi/tokens/${tokenId}/toggle`, { method: 'POST' });
      await loadOpenApi();
      showSuccess('OpenAPI Token 状态已更新。');
    } catch (err) {
      showError((err as Error).message);
    }
  }, [showError, showSuccess, loadOpenApi]);

  const deleteOpenApiToken = useCallback(async (tokenId: string) => {
    try {
      await api(`/api/openapi/tokens/${tokenId}`, { method: 'DELETE' });
      await loadOpenApi();
      showSuccess('OpenAPI Token 已删除。');
    } catch (err) {
      showError((err as Error).message);
    }
  }, [showError, showSuccess, loadOpenApi]);

  return {
    createAccount,
    toggleAccount,
    sendMessage,
    connectPlatform,
    disconnectPlatform,
    saveConfig,
    togglePlugin,
    reloadPlugin,
    deletePlugin,
    updatePluginConfig,
    uploadPlugin,
    loadPluginSource,
    savePluginSource,
    createOpenApiToken,
    toggleOpenApiToken,
    deleteOpenApiToken
  };
}
