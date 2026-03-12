import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AccountsPanel } from './modules/accounts/AccountsPanel';
import { ChatPanel } from './modules/chat/ChatPanel';
import { PlatformPanel } from './modules/platform/PlatformPanel';
import { ConfigPanel } from './modules/config/ConfigPanel';
import { LogsPanel } from './modules/logs/LogsPanel';
import { StatisticsPanel } from './modules/statistics/StatisticsPanel';
import { OpenApiPanel } from './modules/openapi/OpenApiPanel';
import { PluginsPanel } from './modules/plugins/PluginsPanel';
import { api } from './services/api';
import {
  AppConfig,
  BotAccount,
  ChatMessage,
  Conversation,
  MenuKey,
  OpenApiTokenView,
  PlatformLog,
  PlatformStatus,
  PluginInfo,
  StatisticsSnapshot,
  SystemLog
} from './types';

function App() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>('accounts');

  const [accounts, setAccounts] = useState<BotAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [platformStatus, setPlatformStatus] = useState<PlatformStatus>({
    connected: false,
    connecting: false,
    connectedAccountId: null,
    connectedAccountName: null,
    lastConnectedAt: null,
    tokenExpiresAt: null,
    lastError: null
  });
  const [platformLogs, setPlatformLogs] = useState<PlatformLog[]>([]);

  const [config, setConfig] = useState<AppConfig>({
    webName: 'QQBot Console',
    notice: '欢迎使用 QQ 机器人控制台。',
    allowOpenApi: true,
    defaultIntent: 0,
    updatedAt: new Date().toISOString()
  });
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [logType, setLogType] = useState<'all' | 'framework' | 'plugin' | 'openapi' | 'config'>('all');
  const [snapshot, setSnapshot] = useState<StatisticsSnapshot | null>(null);
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [newPlugin, setNewPlugin] = useState({ name: '', description: '', version: '1.0.0' });
  const [openApiEnabled, setOpenApiEnabled] = useState(true);
  const [openApiTokens, setOpenApiTokens] = useState<OpenApiTokenView[]>([]);
  const [newTokenName, setNewTokenName] = useState('');

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('欢迎使用 QQ 机器人控制台。');

  const [newAccount, setNewAccount] = useState({ name: '', appId: '', appSecret: '' });
  const [sendForm, setSendForm] = useState<{ targetType: 'user' | 'group'; targetId: string; text: string }>({
    targetType: 'user',
    targetId: '',
    text: ''
  });

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId),
    [conversations, selectedConversationId]
  );

  const loadAccounts = useCallback(async () => {
    const data = await api<{ items: BotAccount[] }>('/api/accounts');
    setAccounts(data.items);
    if (!selectedAccountId && data.items[0]) {
      setSelectedAccountId(data.items[0].id);
    }
  }, [selectedAccountId]);

  const loadConversations = useCallback(async (accountId: string) => {
    const data = await api<{ items: Conversation[] }>(`/api/conversations?accountId=${accountId}`);
    setConversations(data.items);
    if (data.items[0]) {
      setSelectedConversationId(data.items[0].id);
    } else {
      setSelectedConversationId('');
      setMessages([]);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const data = await api<{ items: ChatMessage[] }>(`/api/conversations/${conversationId}/messages`);
    setMessages(data.items);
  }, []);

  const loadPlatformStatus = useCallback(async () => {
    const data = await api<PlatformStatus>('/api/platform/status');
    setPlatformStatus(data);
  }, []);

  const loadPlatformLogs = useCallback(async () => {
    const data = await api<{ items: PlatformLog[] }>('/api/platform/logs?limit=100');
    setPlatformLogs(data.items);
  }, []);

  const loadConfig = useCallback(async () => {
    const data = await api<AppConfig>('/api/config');
    setConfig(data);
  }, []);

  const loadLogs = useCallback(async (nextType = logType) => {
    const data = await api<{ items: SystemLog[] }>(`/api/logs?type=${nextType}&limit=200`);
    setLogs(data.items);
  }, [logType]);

  const loadStatistics = useCallback(async () => {
    const data = await api<{ snapshot: StatisticsSnapshot }>('/api/statistics');
    setSnapshot(data.snapshot);
  }, []);

  const loadPlugins = useCallback(async () => {
    const data = await api<{ items: PluginInfo[] }>('/api/plugins');
    setPlugins(data.items);
  }, []);

  const loadOpenApi = useCallback(async () => {
    const data = await api<{ enabled: boolean; items: OpenApiTokenView[] }>('/api/openapi/tokens');
    setOpenApiEnabled(data.enabled);
    setOpenApiTokens(data.items);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadAccounts(),
      loadPlatformStatus(),
      loadPlatformLogs(),
      loadConfig(),
      loadLogs('all'),
      loadStatistics(),
      loadPlugins(),
      loadOpenApi()
    ])
      .catch((e: Error) => setNotice(e.message))
      .finally(() => setLoading(false));
  }, [loadAccounts, loadPlatformStatus, loadPlatformLogs, loadConfig, loadLogs, loadStatistics, loadPlugins, loadOpenApi]);

  useEffect(() => {
    if (!selectedAccountId) return;
    loadConversations(selectedAccountId).catch((e: Error) => setNotice(e.message));
  }, [selectedAccountId, loadConversations]);

  useEffect(() => {
    if (!selectedConversationId) return;
    loadMessages(selectedConversationId).catch((e: Error) => setNotice(e.message));
  }, [selectedConversationId, loadMessages]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadPlatformStatus().catch(() => undefined);
      if (activeMenu === 'platform') {
        loadPlatformLogs().catch(() => undefined);
      }
      if (activeMenu === 'logs') {
        loadLogs().catch(() => undefined);
      }
      if (activeMenu === 'statistics') {
        loadStatistics().catch(() => undefined);
      }
      if (activeMenu === 'chat' && selectedAccountId) {
        loadConversations(selectedAccountId)
          .then(() => {
            if (selectedConversationId) {
              return loadMessages(selectedConversationId);
            }
            return undefined;
          })
          .catch(() => undefined);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [activeMenu, logType, selectedAccountId, selectedConversationId, loadPlatformStatus, loadPlatformLogs, loadLogs, loadStatistics, loadConversations, loadMessages]);

  const createAccount = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await api<BotAccount>('/api/accounts', {
        method: 'POST',
        body: JSON.stringify(newAccount)
      });
      setNotice(`账号“${created.name}”已创建，请点击启动。`);
      setNewAccount({ name: '', appId: '', appSecret: '' });
      await loadAccounts();
      setSelectedAccountId(created.id);
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccount = async (account: BotAccount) => {
    const action = account.status === 'ONLINE' ? 'stop' : 'start';
    setLoading(true);
    try {
      await api(`/api/accounts/${account.id}/${action}`, { method: 'POST' });
      await loadAccounts();
      setNotice(`账号“${account.name}”已${action === 'start' ? '启动' : '停用'}。`);
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      setNotice('请先选择账号。');
      return;
    }

    setLoading(true);
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
      setNotice(`消息发送完成：${sendResult.status}`);
      setSendForm((prev) => ({ ...prev, text: '' }));
      await loadConversations(selectedAccountId);
      if (selectedConversationId) {
        await loadMessages(selectedConversationId);
      }
      await loadPlatformLogs();
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const connectPlatform = async () => {
    if (!selectedAccountId) {
      setNotice('请先在账号管理中选择账号。');
      return;
    }

    setLoading(true);
    try {
      await api('/api/platform/connect', {
        method: 'POST',
        body: JSON.stringify({ accountId: selectedAccountId })
      });
      await Promise.all([loadPlatformStatus(), loadPlatformLogs()]);
      setNotice('已触发连接 QQ 平台。');
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const disconnectPlatform = async () => {
    setLoading(true);
    try {
      await api('/api/platform/disconnect', { method: 'POST', body: JSON.stringify({}) });
      await Promise.all([loadPlatformStatus(), loadPlatformLogs()]);
      setNotice('已断开 QQ 平台连接。');
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/api/config', { method: 'POST', body: JSON.stringify(config) });
      await loadConfig();
      setNotice('配置已保存。');
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const createPlugin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/api/plugins', { method: 'POST', body: JSON.stringify(newPlugin) });
      setNewPlugin({ name: '', description: '', version: '1.0.0' });
      await loadPlugins();
      setNotice('插件已创建。');
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const togglePlugin = async (pluginId: string) => {
    setLoading(true);
    try {
      await api(`/api/plugins/${pluginId}/toggle`, { method: 'POST' });
      await loadPlugins();
      setNotice('插件状态已更新。');
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const createOpenApiToken = async () => {
    if (!newTokenName.trim()) {
      setNotice('请输入 Token 名称。');
      return;
    }
    setLoading(true);
    try {
      const created = await api<{ token: string; name: string }>('/api/openapi/tokens', { method: 'POST', body: JSON.stringify({ name: newTokenName }) });
      setNewTokenName('');
      await loadOpenApi();
      setNotice(`OpenAPI Token 已创建。Token: ${created.token}（请立即保存，此值仅显示一次）`);
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleOpenApiToken = async (tokenId: string) => {
    setLoading(true);
    try {
      await api(`/api/openapi/tokens/${tokenId}/toggle`, { method: 'POST' });
      await loadOpenApi();
      setNotice('OpenAPI Token 状态已更新。');
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const menuItems: { key: MenuKey; label: string }[] = [
    { key: 'accounts', label: '账号管理' },
    { key: 'chat', label: '聊天管理' },
    { key: 'platform', label: 'QQ 平台连接' },
    { key: 'config', label: '配置中心' },
    { key: 'logs', label: '日志中心' },
    { key: 'statistics', label: '统计中心' },
    { key: 'openapi', label: '开放 API' },
    { key: 'plugins', label: '插件中心' }
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">{config.webName || 'QQBot Console'}</div>
        {menuItems.map((item) => (
          <button
            key={item.key}
            className={`nav-btn ${activeMenu === item.key ? 'active' : ''}`}
            onClick={() => setActiveMenu(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </aside>

      <main className="main">
        <header className="topbar">
          <h1>{config.webName || 'QQ 机器人控制台'}</h1>
          <span className={`pill ${platformStatus.connected ? 'ok' : 'off'}`}>
            平台状态：{platformStatus.connected ? '已连接' : platformStatus.connecting ? '连接中' : '未连接'}
          </span>
        </header>

        <p className="notice">{loading ? '处理中，请稍候...' : notice || config.notice}</p>

        {activeMenu === 'accounts' && (
          <AccountsPanel
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            newAccount={newAccount}
            onNewAccountChange={setNewAccount}
            onCreateAccount={createAccount}
            onSelectAccount={setSelectedAccountId}
            onToggleAccount={toggleAccount}
          />
        )}

        {activeMenu === 'chat' && (
          <ChatPanel
            accounts={accounts}
            platformStatus={platformStatus}
          />
        )}

        {activeMenu === 'platform' && (
          <PlatformPanel
            platformStatus={platformStatus}
            platformLogs={platformLogs}
            onConnect={connectPlatform}
            onDisconnect={disconnectPlatform}
            onRefresh={() => {
              loadPlatformStatus().catch((e: Error) => setNotice(e.message));
              loadPlatformLogs().catch((e: Error) => setNotice(e.message));
            }}
          />
        )}

        {activeMenu === 'config' && <ConfigPanel config={config} onChange={setConfig} onSave={saveConfig} />}

        {activeMenu === 'logs' && (
          <LogsPanel
            logs={logs}
            logType={logType}
            onChangeType={(next) => {
              setLogType(next);
              loadLogs(next).catch((e: Error) => setNotice(e.message));
            }}
            onRefresh={() => loadLogs().catch((e: Error) => setNotice(e.message))}
          />
        )}

        {activeMenu === 'statistics' && (
          <StatisticsPanel snapshot={snapshot} onRefresh={() => loadStatistics().catch((e: Error) => setNotice(e.message))} />
        )}

        {activeMenu === 'openapi' && (
          <OpenApiPanel
            enabled={openApiEnabled}
            tokens={openApiTokens}
            newTokenName={newTokenName}
            onTokenNameChange={setNewTokenName}
            onCreateToken={createOpenApiToken}
            onToggleToken={toggleOpenApiToken}
            onRefresh={() => loadOpenApi().catch((e: Error) => setNotice(e.message))}
          />
        )}

        {activeMenu === 'plugins' && (
          <PluginsPanel
            plugins={plugins}
            newPlugin={newPlugin}
            onNewPluginChange={setNewPlugin}
            onCreatePlugin={createPlugin}
            onTogglePlugin={togglePlugin}
          />
        )}
      </main>
    </div>
  );
}

export default App;
