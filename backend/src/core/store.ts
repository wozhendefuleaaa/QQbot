import { existsSync, promises as fs, writeFileSync, mkdirSync, renameSync, unlinkSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
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
import { fetchAccessToken, QQ_API_BASE } from './qqbot/auth.js';

export const accounts: BotAccount[] = [];
export const conversations: Conversation[] = [];
export const messages: Message[] = [];
export const platformLogs: PlatformLog[] = [];
export const systemLogs: SystemLog[] = [];
export const plugins: PluginInfo[] = [];
export const openApiTokens: OpenApiToken[] = [];
export const quickReplies: QuickReply[] = [];

const conversationById = new Map<string, Conversation>();
const messagesByConversationId = new Map<string, Message[]>();
let statsInboundCount = 0;
let statsOutboundCount = 0;

function rebuildIndexes() {
  conversationById.clear();
  messagesByConversationId.clear();
  statsInboundCount = 0;
  statsOutboundCount = 0;
  for (const conv of conversations) {
    conversationById.set(conv.id, conv);
  }
  for (const msg of messages) {
    if (!messagesByConversationId.has(msg.conversationId)) {
      messagesByConversationId.set(msg.conversationId, []);
    }
    messagesByConversationId.get(msg.conversationId)!.push(msg);
    if (msg.direction === 'in') statsInboundCount++;
    else statsOutboundCount++;
  }
}

export function findConversationById(id: string): Conversation | undefined {
  return conversationById.get(id) ?? conversations.find((c) => c.id === id);
}

export function findMessagesByConversationId(convId: string): Message[] {
  return messagesByConversationId.get(convId) ?? messages.filter((m) => m.conversationId === convId);
}

export const nowIso = () => new Date().toISOString();
export const id = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
export const maskSecret = (input: string) => input.length > 4 ? `${input.slice(0, 2)}***${input.slice(-2)}` : '***';
export const hashToken = (raw: string): string => crypto.createHash('sha256').update(raw).digest('hex');

export const qqApiBase = process.env.QQ_API_BASE || 'https://bots.qq.com';
export const qqGatewayUrlFromEnv = process.env.QQ_GATEWAY_URL || '';
export const qqGatewayApiBase = process.env.QQ_GATEWAY_API_BASE || 'https://api.sgroup.qq.com';
export const qqAuthPrefix = process.env.QQ_AUTH_PREFIX || 'QQBot';
export const qqMessageApiTemplate = process.env.QQ_MESSAGE_API_TEMPLATE || '';

export const gatewayIntents = Number(process.env.QQ_GATEWAY_INTENTS || 0);
if (!Number.isFinite(gatewayIntents) || gatewayIntents < 0) {
  throw new Error('QQ_GATEWAY_INTENTS 配置无效，必须是非负数字');
}

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
  pluginPermissions: {},
  yunzaiPermission: {
    masterIds: [],
    adminIds: []
  },
  updatedAt: nowIso()
};

export function toPublicAccount(account: BotAccount): PublicBotAccount {
  const { appSecret: _appSecret, ...rest } = account;
  return rest;
}

async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    const e = error as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') return null;
    throw error;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDataDir();
  const tmpPath = filePath + '.tmp';
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmpPath, filePath);
}

export function writeJsonFileSync<T>(filePath: string, data: T): void {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  const tmpPath = filePath + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  renameSync(tmpPath, filePath);
}

export async function loadAccountsFromDisk() {
  try {
    await ensureDataDir();
    const parsed = await readJsonFile<BotAccount[]>(accountsFilePath);
    if (Array.isArray(parsed)) {
      accounts.splice(
        0,
        accounts.length,
        ...parsed.filter(
          (x) =>
            x?.id &&
            x?.name &&
            ((x.platformType === 'onebot_v11' && x.onebotSelfId) ||
              ((x.platformType === 'qq_official' || !x.platformType) && x?.appId && x?.appSecret))
        )
      );
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
    // 兼容旧配置：将 pluginBlacklist 转换为 pluginPermissions
    if (parsed.pluginPermissions && typeof parsed.pluginPermissions === 'object') {
      appConfig.pluginPermissions = parsed.pluginPermissions;
    } else if (Array.isArray((parsed as any).pluginBlacklist)) {
      // 转换旧的黑名单格式到新格式
      const oldBlacklist = (parsed as any).pluginBlacklist;
      for (const rule of oldBlacklist) {
        if (!rule.accountId || !rule.groupId || !Array.isArray(rule.pluginIds)) continue;
        if (!appConfig.pluginPermissions[rule.accountId]) {
          appConfig.pluginPermissions[rule.accountId] = {
            accountId: rule.accountId,
            groups: [],
            disabledPlugins: {}
          };
        }
        const perm = appConfig.pluginPermissions[rule.accountId];
        if (!perm.groups.includes(rule.groupId)) {
          perm.groups.push(rule.groupId);
        }
        perm.disabledPlugins[rule.groupId] = rule.pluginIds;
      }
    }
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
  const migrated = openApiTokens.filter((item) => !/^[a-f0-9]{64}$/.test(item.token));
  if (migrated.length > 0) {
    for (const item of migrated) {
      item.token = hashToken(item.token);
    }
    await saveOpenApiTokensToDisk();
    addPlatformLog('INFO', `已迁移 ${migrated.length} 个 OpenAPI Token 为哈希存储`);
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
    rebuildIndexes();
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

export function syncSaveCriticalData(): void {
  try {
    writeJsonFileSync(conversationsFilePath, conversations);
    writeJsonFileSync(messagesFilePath, messages);
    writeJsonFileSync(accountsFilePath, accounts);
    writeJsonFileSync(appConfigFilePath, appConfig);
    writeJsonFileSync(openApiTokensFilePath, openApiTokens);
    writeJsonFileSync(pluginsFilePath, plugins);
  } catch {
    // 崩溃保存失败时静默忽略
  }
}

export function cleanupTmpFiles(): void {
  try {
    const allPaths = [
      conversationsFilePath, messagesFilePath, accountsFilePath,
      appConfigFilePath, openApiTokensFilePath, pluginsFilePath,
      quickRepliesFilePath,
    ];
    for (const p of allPaths) {
      const tmpPath = p + '.tmp';
      if (existsSync(tmpPath)) {
        unlinkSync(tmpPath);
        console.log(`[store] 清理残留临时文件: ${tmpPath}`);
      }
    }
  } catch {
    // 清理失败时静默忽略
  }
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
  try {
    const token = await fetchAccessToken(
      { appId: account.appId, appSecret: account.appSecret },
      forceRefresh
    );
    platformStatus.tokenExpiresAt = new Date(Date.now() + 7200 * 1000).toISOString();
    return token;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    addPlatformLog('ERROR', `获取 AccessToken 失败（账号：${account.name}）: ${msg}`);
    throw error;
  }
}

function trimMessagesIfNeeded(): void {
  if (messages.length <= 10000) return;
  const removed = messages.splice(0, messages.length - 10000);
  for (const rm of removed) {
    if (rm.direction === 'in') statsInboundCount--;
    else statsOutboundCount--;
  }
  rebuildIndexes();
}

export { trimMessagesIfNeeded };

export function recordOutboundMessage(accountId: string, conversationId: string, text: string): Message {
  const msg: Message = {
    id: id('msg'),
    accountId,
    conversationId,
    direction: 'out',
    text,
    createdAt: nowIso()
  };
  messages.push(msg);
  statsOutboundCount++;
  if (!messagesByConversationId.has(conversationId)) {
    messagesByConversationId.set(conversationId, []);
  }
  messagesByConversationId.get(conversationId)!.push(msg);
  trimMessagesIfNeeded();
  scheduleSaveChatDataToDisk();
  return msg;
}

export function ensureConversationForInboundByAccount(
  accountId: string,
  peerId: string,
  content: string,
  peerType: 'user' | 'group' = 'user',
  options?: { peerName?: string; inboundMsgId?: string | null }
) {
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
    conversationById.set(conv.id, conv);
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
  statsInboundCount++;
  if (!messagesByConversationId.has(msg.conversationId)) {
    messagesByConversationId.set(msg.conversationId, []);
  }
  messagesByConversationId.get(msg.conversationId)!.push(msg);
  trimMessagesIfNeeded();
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

export function ensureConversationForInbound(
  peerId: string,
  content: string,
  peerType: 'user' | 'group' = 'user',
  options?: { peerName?: string; inboundMsgId?: string | null }
) {
  const accountId = platformStatus.connectedAccountId || accounts.find((a) => a.status === 'ONLINE')?.id || accounts[0]?.id;
  if (!accountId) return null;
  return ensureConversationForInboundByAccount(accountId, peerId, content, peerType, options);
}

export function buildStatisticsSnapshot(): StatisticsSnapshot {
  const today = new Date().toISOString().slice(0, 10);
  const inboundMessages = statsInboundCount;
  const outboundMessages = statsOutboundCount;
  
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
      const conv = findConversationById(msg.conversationId);
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
      const conv = findConversationById(id);
      return { id, name: conv?.peerName || id, messageCount };
    });
  
  // 获取 Top 5 用户
  const topUsers = Array.from(userMessageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, messageCount]) => {
      const conv = findConversationById(id);
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
