import { existsSync, promises as fs } from 'fs';
import path from 'path';
import {
  AppConfig,
  BotAccount,
  Conversation,
  LogLevel,
  Message,
  OpenApiToken,
  PlatformLog,
  PlatformStatus,
  PluginInfo,
  PublicBotAccount,
  QuickReply,
  StatisticsSnapshot,
  SystemLog
} from '../types.js';

export const accounts: BotAccount[] = [];
export const conversations: Conversation[] = [];
export const messages: Message[] = [];
export const platformLogs: PlatformLog[] = [];
export const systemLogs: SystemLog[] = [];
export const plugins: PluginInfo[] = [];
export const openApiTokens: OpenApiToken[] = [];
export const quickReplies: QuickReply[] = [];

export const nowIso = () => new Date().toISOString();
export const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
export const maskSecret = (input: string) => `${input.slice(0, 2)}***${input.slice(-2)}`;

export const qqApiBase = process.env.QQ_API_BASE || 'https://bots.qq.com';
export const qqGatewayUrlFromEnv = process.env.QQ_GATEWAY_URL || '';
export const qqGatewayApiBase = process.env.QQ_GATEWAY_API_BASE || 'https://api.sgroup.qq.com';
export const qqAuthPrefix = process.env.QQ_AUTH_PREFIX || 'QQBot';
export const qqMessageApiTemplate = process.env.QQ_MESSAGE_API_TEMPLATE || '';

export const gatewayIntents = Number(process.env.QQ_GATEWAY_INTENTS || 0);
if (!Number.isFinite(gatewayIntents) || gatewayIntents < 0) {
  throw new Error('QQ_GATEWAY_INTENTS 配置无效，必须是非负数字');
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

const configuredDataDir = process.env.BACKEND_DATA_DIR?.trim();
const defaultDataDir = existsSync(path.resolve(process.cwd(), 'backend'))
  ? path.resolve(process.cwd(), 'backend/data')
  : path.resolve(process.cwd(), 'data');
const dataDir = configuredDataDir ? path.resolve(configuredDataDir) : defaultDataDir;
const accountsFilePath = path.join(dataDir, 'accounts.json');
const appConfigFilePath = path.join(dataDir, 'app-config.json');
const pluginsFilePath = path.join(dataDir, 'plugins.json');
const openApiTokensFilePath = path.join(dataDir, 'openapi-tokens.json');
const conversationsFilePath = path.join(dataDir, 'conversations.json');
const messagesFilePath = path.join(dataDir, 'messages.json');
const quickRepliesFilePath = path.join(dataDir, 'quick-replies.json');

let chatPersistTimer: NodeJS.Timeout | null = null;

export const platformStatus: PlatformStatus = {
  connected: false,
  connecting: false,
  connectedAccountId: null,
  connectedAccountName: null,
  lastConnectedAt: null,
  tokenExpiresAt: null,
  lastError: null
};

export const appConfig: AppConfig = {
  webName: 'QQBot Console',
  notice: '欢迎使用 QQ 机器人控制台。',
  allowOpenApi: true,
  defaultIntent: gatewayIntents,
  updatedAt: nowIso()
};

export function toPublicAccount(account: BotAccount): PublicBotAccount {
  const { appSecret: _appSecret, ...rest } = account;
  return rest;
}

async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    const e = error as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') return null;
    throw error;
  }
}

export async function loadAccountsFromDisk() {
  try {
    await ensureDataDir();
    const parsed = await readJsonFile<BotAccount[]>(accountsFilePath);
    if (Array.isArray(parsed)) {
      accounts.splice(0, accounts.length, ...parsed.filter((x) => x?.id && x?.appId && x?.appSecret));
      addPlatformLog('INFO', `已加载账号存储：${accounts.length} 个`);
    }
  } catch (error) {
    const e = error as Error;
    addPlatformLog('WARN', `加载账号存储失败：${e.message}`);
  }
}

export async function saveAccountsToDisk() {
  await ensureDataDir();
  await fs.writeFile(accountsFilePath, JSON.stringify(accounts, null, 2), 'utf8');
}

export async function loadAppConfigFromDisk() {
  const parsed = await readJsonFile<Partial<AppConfig>>(appConfigFilePath);
  if (parsed) {
    appConfig.webName = parsed.webName || appConfig.webName;
    appConfig.notice = parsed.notice || appConfig.notice;
    appConfig.allowOpenApi = typeof parsed.allowOpenApi === 'boolean' ? parsed.allowOpenApi : appConfig.allowOpenApi;
    appConfig.defaultIntent = Number.isFinite(Number(parsed.defaultIntent))
      ? Number(parsed.defaultIntent)
      : appConfig.defaultIntent;
    appConfig.updatedAt = parsed.updatedAt || appConfig.updatedAt;
  }
}

export async function saveAppConfigToDisk() {
  await ensureDataDir();
  appConfig.updatedAt = nowIso();
  await fs.writeFile(appConfigFilePath, JSON.stringify(appConfig, null, 2), 'utf8');
}

export async function loadPluginsFromDisk() {
  const parsed = await readJsonFile<PluginInfo[]>(pluginsFilePath);
  if (Array.isArray(parsed)) {
    plugins.splice(0, plugins.length, ...parsed.filter((x) => x?.id && x?.name));
  }
  if (plugins.length === 0) {
    plugins.push({
      id: id('plg'),
      name: 'system-echo',
      enabled: true,
      version: '1.0.0',
      description: '示例插件：回显消息日志',
      updatedAt: nowIso()
    });
    await savePluginsToDisk();
  }
}

export async function savePluginsToDisk() {
  await ensureDataDir();
  await fs.writeFile(pluginsFilePath, JSON.stringify(plugins, null, 2), 'utf8');
}

export async function loadOpenApiTokensFromDisk() {
  const parsed = await readJsonFile<OpenApiToken[]>(openApiTokensFilePath);
  if (Array.isArray(parsed)) {
    openApiTokens.splice(0, openApiTokens.length, ...parsed.filter((x) => x?.id && x?.token));
  }
}

export async function saveOpenApiTokensToDisk() {
  await ensureDataDir();
  await fs.writeFile(openApiTokensFilePath, JSON.stringify(openApiTokens, null, 2), 'utf8');
}

export async function loadQuickRepliesFromDisk() {
  const parsed = await readJsonFile<QuickReply[]>(quickRepliesFilePath);
  if (Array.isArray(parsed)) {
    quickReplies.splice(0, quickReplies.length, ...parsed.filter((x) => x?.id && x?.text));
  }
}

export async function saveQuickRepliesToDisk() {
  await ensureDataDir();
  await fs.writeFile(quickRepliesFilePath, JSON.stringify(quickReplies, null, 2), 'utf8');
}

export async function loadChatDataFromDisk() {
  try {
    await ensureDataDir();

    const parsedConversations = await readJsonFile<Conversation[]>(conversationsFilePath);
    if (Array.isArray(parsedConversations)) {
      conversations.splice(
        0,
        conversations.length,
        ...parsedConversations.filter((x) => x?.id && x?.accountId && x?.peerId)
      );
    }

    const parsedMessages = await readJsonFile<Message[]>(messagesFilePath);
    if (Array.isArray(parsedMessages)) {
      messages.splice(
        0,
        messages.length,
        ...parsedMessages.filter((x) => x?.id && x?.accountId && x?.conversationId)
      );
    }

    addPlatformLog('INFO', `已加载聊天存储：会话 ${conversations.length} 条，消息 ${messages.length} 条`);
  } catch (error) {
    const e = error as Error;
    addPlatformLog('WARN', `加载聊天存储失败：${e.message}`);
  }
}

export async function saveChatDataToDisk() {
  await ensureDataDir();
  await fs.writeFile(conversationsFilePath, JSON.stringify(conversations, null, 2), 'utf8');
  await fs.writeFile(messagesFilePath, JSON.stringify(messages, null, 2), 'utf8');
}

export async function flushSaveChatDataToDisk() {
  if (chatPersistTimer) {
    clearTimeout(chatPersistTimer);
    chatPersistTimer = null;
  }

  try {
    await saveChatDataToDisk();
  } catch (error) {
    const e = error as Error;
    addPlatformLog('WARN', `保存聊天存储失败：${e.message}`);
  }
}

export function scheduleSaveChatDataToDisk() {
  if (chatPersistTimer) return;

  chatPersistTimer = setTimeout(() => {
    void flushSaveChatDataToDisk();
  }, 200);
}

export function addPlatformLog(level: LogLevel, message: string) {
  const item: PlatformLog = {
    id: id('log'),
    level,
    message,
    createdAt: nowIso()
  };
  platformLogs.unshift(item);
  if (platformLogs.length > 300) {
    platformLogs.length = 300;
  }
  addSystemLog(level, 'framework', message);
  console.log(`[platform][${level}] ${message}`);
}

export function addSystemLog(level: LogLevel, category: SystemLog['category'], message: string) {
  const item: SystemLog = {
    id: id('slog'),
    level,
    category,
    message,
    createdAt: nowIso()
  };
  systemLogs.unshift(item);
  if (systemLogs.length > 1000) {
    systemLogs.length = 1000;
  }
}

export function setPlatformError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  platformStatus.lastError = msg;
  addPlatformLog('ERROR', msg);
}

export async function fetchAppAccessToken(account: BotAccount, forceRefresh = false) {
  const now = Date.now();
  const cached = tokenCache.get(account.id);
  if (!forceRefresh && cached && cached.expiresAt - now > 60_000) {
    return cached.token;
  }

  if (!account.appId || !account.appSecret) {
    throw new Error('账号缺少 AppID 或 AppSecret');
  }

  const url = `${qqApiBase}/app/getAppAccessToken`;
  addPlatformLog('INFO', `获取 QQ AccessToken: ${url}（账号：${account.name}）`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId: account.appId, clientSecret: account.appSecret })
  });

  if (!res.ok) {
    throw new Error(`获取 AccessToken 失败: HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token?: string;
    accessToken?: string;
    expires_in?: number;
    expiresIn?: number;
  };

  const token = data.access_token || data.accessToken;
  const expiresIn = Number(data.expires_in || data.expiresIn || 7200);

  if (!token) {
    throw new Error('AccessToken 响应缺少 access_token 字段');
  }

  const expiresAt = Date.now() + expiresIn * 1000;
  tokenCache.set(account.id, { token, expiresAt });
  platformStatus.tokenExpiresAt = new Date(expiresAt).toISOString();
  addPlatformLog('INFO', `AccessToken 获取成功（账号：${account.name}）`);
  return token;
}

export function ensureConversationForInbound(
  peerId: string,
  content: string,
  peerType: 'user' | 'group' = 'user',
  options?: { peerName?: string; inboundMsgId?: string | null }
) {
  const accountId = platformStatus.connectedAccountId || accounts.find((a) => a.status === 'ONLINE')?.id || accounts[0]?.id;
  if (!accountId) return null;

  let conv = conversations.find(
    (c) => c.accountId === accountId && c.peerId === peerId && c.peerType === peerType
  );
  if (!conv) {
    conv = {
      id: id('conv'),
      accountId,
      peerId,
      peerType,
      peerName: options?.peerName || `${peerType === 'group' ? '群聊' : '用户'} ${peerId}`,
      lastMessage: '',
      lastInboundMsgId: null,
      updatedAt: nowIso()
    };
    conversations.unshift(conv);
  }

  if (options?.peerName) {
    conv.peerName = options.peerName;
  }

  const msg: Message = {
    id: id('msg'),
    accountId,
    conversationId: conv.id,
    direction: 'in',
    text: content,
    createdAt: nowIso()
  };

  messages.push(msg);
  // 限制消息数量上限为 10000 条
  if (messages.length > 10000) {
    messages.splice(0, messages.length - 10000);
  }
  conv.lastMessage = content;
  conv.lastInboundMsgId = options?.inboundMsgId || conv.lastInboundMsgId || null;
  conv.updatedAt = nowIso();

  scheduleSaveChatDataToDisk();

  return {
    accountId,
    conversationId: conv.id,
    messageId: msg.id
  };
}

export function buildStatisticsSnapshot(): StatisticsSnapshot {
  const today = new Date().toISOString().slice(0, 10);
  const inboundMessages = messages.filter((m) => m.direction === 'in').length;
  const outboundMessages = messages.filter((m) => m.direction === 'out').length;
  
  // 计算会话类型分布
  const privateConvs = conversations.filter((c) => c.peerType === 'user').length;
  const groupConvs = conversations.filter((c) => c.peerType === 'group').length;
  
  // 计算平台运行时间（秒）
  const platformUptime = platformStatus.connected && platformStatus.lastConnectedAt
    ? Math.floor((Date.now() - new Date(platformStatus.lastConnectedAt).getTime()) / 1000)
    : 0;
  
  // 计算活跃群组和用户（按消息数量排序）
  const groupMessageCounts = new Map<string, number>();
  const userMessageCounts = new Map<string, number>();
  
  for (const msg of messages) {
    if (msg.direction === 'in') {
      const conv = conversations.find((c) => c.id === msg.conversationId);
      if (conv) {
        if (conv.peerType === 'group') {
          const count = groupMessageCounts.get(conv.id) || 0;
          groupMessageCounts.set(conv.id, count + 1);
        } else {
          const count = userMessageCounts.get(conv.id) || 0;
          userMessageCounts.set(conv.id, count + 1);
        }
      }
    }
  }
  
  // 获取 Top 5 群组
  const topGroups = Array.from(groupMessageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, messageCount]) => {
      const conv = conversations.find((c) => c.id === id);
      return { id, name: conv?.peerName || id, messageCount };
    });
  
  // 获取 Top 5 用户
  const topUsers = Array.from(userMessageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, messageCount]) => {
      const conv = conversations.find((c) => c.id === id);
      return { id, name: conv?.peerName || id, messageCount };
    });

  return {
    date: today,
    activeAccounts: accounts.filter((a) => a.status === 'ONLINE').length,
    totalAccounts: accounts.length,
    conversations: conversations.length,
    privateConversations: privateConvs,
    groupConversations: groupConvs,
    inboundMessages,
    outboundMessages,
    platformConnected: platformStatus.connected,
    platformUptime,
    quickReplies: quickReplies.length,
    plugins: plugins.length,
    topGroups,
    topUsers
  };
}
