import { existsSync, promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Plugin, PluginContext, PluginConfig, MessageEvent, CommandDefinition } from './plugin-types.js';
import { addSystemLog, plugins as pluginRegistry, savePluginsToDisk, accounts, platformStatus, conversations, messages } from './store.js';
import { sendTextMessage, sendPlatformMarkdown, sendPlatformKeyboard, sendPlatformMarkdownWithKeyboard } from '../modules/platform/unified-sender.js';
import { broadcastNewMessage } from '../modules/sse/routes.js';
import { Message } from '../types.js';
import { initYunzaiGlobals, createYunzaiBot, createYunzaiEvent } from './yunzai/index.js';
import { matchesCronPattern } from './plugin-utils.js';
import { MessageBuilder } from './qqbot/segment.js';
import type { MarkdownPayload } from './qqbot/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_PLUGINS_DIR = path.join(__dirname, '..', '..', 'src', 'plugins');
const DIST_PLUGINS_DIR = path.join(__dirname, '..', 'plugins');
export const PLUGINS_DIR = existsSync(SRC_PLUGINS_DIR) ? SRC_PLUGINS_DIR : DIST_PLUGINS_DIR;

export const defaultConfig: PluginConfig = {
  commandPrefix: '/', allowGroup: true, allowPrivate: true,
  adminUserIds: [], ownerIds: []
};

export const loadedPlugins: Map<string, Plugin> = new Map();
export let pluginConfig: PluginConfig = { ...defaultConfig };
export const commandCooldowns: Map<string, number> = new Map();
export let helpCommandCache: string | null = null;
export const pluginCronDisposers: Map<string, Array<() => void>> = new Map();

export function setHelpCommandCache(value: string | null): void { helpCommandCache = value; }
export function setPluginConfig(value: PluginConfig): void { pluginConfig = value; }

async function sendPlatformText(targetId: string, targetType: 'user' | 'group', text: string, msgId?: string, accountId?: string): Promise<void> {
  const effectiveAccountId = accountId || platformStatus.connectedAccountId;
  if (!effectiveAccountId) { addSystemLog('WARN', 'plugin', `平台未连接`); return; }
  const account = accounts.find(a => a.id === effectiveAccountId);
  if (!account) { addSystemLog('WARN', 'plugin', `未找到账号`); return; }
  await sendTextMessage(account, targetId, text, msgId, targetType);
}

export const sharedYunzaiBot = createYunzaiBot('default', {}, {
  sendMessage: async (targetId, targetType, text, msgId) => {
    await sendPlatformText(targetId, targetType, text, msgId);
  }
});
initYunzaiGlobals(sharedYunzaiBot);

export function buildYunzaiMessageEvent(event: MessageEvent, ctx: PluginContext, msgId?: string) {
  const accountId = ctx.getConnectedAccountId() || 'default';
  const yunzaiEvent = createYunzaiEvent(
    {
      author: { id: event.senderId, username: event.senderName || '' },
      content: event.message.text, group_id: event.groupId, id: event.message.id,
      message_id: event.message.id, group_name: event.groupId || '',
      member: { nick: event.senderName || '', roles: [] }
    },
    accountId,
    async (targetId, targetType, text) => { await ctx.sendMessage(targetId, targetType, text || ''); }
  );
  yunzaiEvent.message_id = msgId || event.message.id;
  return yunzaiEvent;
}

function scheduleCronJob(pluginId: string, job: NonNullable<Plugin['cronJobs']>[number], disposers: Array<() => void>): void {
  let lastRunKey = '';
  let timeout: ReturnType<typeof setTimeout>;
  
  const run = () => {
    const now = new Date();
    const runKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
    if (runKey !== lastRunKey && matchesCronPattern(job.pattern, now)) {
      lastRunKey = runKey;
      Promise.resolve(job.handler(createPluginContext(pluginId))).catch((error: unknown) => {
        addSystemLog('ERROR', 'plugin', `[云崽任务] ${pluginId} 执行失败: ${error}`);
      });
    }
    // 计算到下一个整分钟的时间，减小 CPU 消耗
    const nextMinute = new Date(now);
    nextMinute.setMinutes(nextMinute.getMinutes() + 1, 0, 0);
    const delay = nextMinute.getTime() - Date.now();
    timeout = setTimeout(run, Math.max(1000, delay));
  };

  // 首次执行延迟到下一个整分钟后
  const now = new Date();
  const firstDelay = (60 - now.getSeconds()) * 1000;
  timeout = setTimeout(run, Math.max(100, firstDelay));
  
  disposers.push(() => clearTimeout(timeout));
}

export function registerCronJobs(pluginId: string, plugin: Plugin): void {
  const disposers: Array<() => void> = [];
  if (plugin.cronJobs) {
    for (const job of plugin.cronJobs) {
      scheduleCronJob(pluginId, job, disposers);
    }
  }
  if (disposers.length > 0) pluginCronDisposers.set(pluginId, disposers);
}

export async function disposePluginRuntime(pluginId: string, plugin?: Plugin): Promise<void> {
  const disposers = pluginCronDisposers.get(pluginId) || [];
  disposers.forEach(d => d());
  pluginCronDisposers.delete(pluginId);
  if (plugin?.dispose) await plugin.dispose();
}

export function ensurePluginRegistryEntry(plugin: Plugin): boolean {
  const existing = pluginRegistry.find(p => p.id === plugin.id);
  if (existing) {
    existing.name = plugin.name; existing.version = plugin.version;
    existing.description = plugin.description;
    existing.updatedAt = new Date().toISOString();
    return false;
  }
  pluginRegistry.unshift({
    id: plugin.id, name: plugin.name, enabled: true,
    version: plugin.version, description: plugin.description,
    updatedAt: new Date().toISOString()
  });
  return true;
}

export async function persistPluginRegistryIfNeeded(changed: boolean): Promise<void> {
  if (changed) await savePluginsToDisk();
}

export function createPluginContext(
  pluginId: string,
  replyInfo?: { accountId?: string; targetId: string; targetType: 'user' | 'group'; msgId?: string }
): PluginContext {
  const accountId = replyInfo?.accountId || platformStatus.connectedAccountId;

  const sendAndLog = async (
    finalTargetId: string, finalTargetType: 'user' | 'group', text: string,
    replyMsgId?: string
  ) => {
    if (!accountId) { addSystemLog('WARN', 'plugin', `[${pluginId}] 平台未连接`); return; }
    const account = accounts.find(a => a.id === accountId);
    if (!account) { addSystemLog('WARN', 'plugin', `[${pluginId}] 未找到账号`); return; }
    if (!finalTargetId) throw new Error('未指定发送目标');
    await sendTextMessage(account, finalTargetId, text, replyMsgId, finalTargetType);
    const conv = conversations.find(
      c => c.accountId === accountId && c.peerId === finalTargetId && c.peerType === finalTargetType
    );
    if (conv) {
      const outboundMsg: Message = {
        id: `plugin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        accountId, conversationId: conv.id, direction: 'out', text,
        createdAt: new Date().toISOString(), status: 'sent'
      };
      messages.push(outboundMsg);
      broadcastNewMessage(conv.id, outboundMsg);
    }
  };

  const resolveTarget = (targetId?: string, targetType?: 'user' | 'group') => ({
    id: targetId || replyInfo?.targetId || '',
    type: targetType || replyInfo?.targetType || 'user' as const,
  });

  return {
    sendMessage: async (targetId, targetType, text) => {
      const t = resolveTarget(targetId, targetType);
      await sendAndLog(t.id, t.type, text, replyInfo?.msgId);
    },

    sendRichMessage: async (targetId, targetType, builderFn) => {
      const t = resolveTarget(targetId, targetType);
      const builder = new MessageBuilder();
      builderFn(builder);
      const request = builder.build();
      const text = request.content || builder.buildText();
      await sendAndLog(t.id, t.type, text, replyInfo?.msgId);
    },

    sendMarkdown: async (targetId, targetType, markdown) => {
      const t = resolveTarget(targetId, targetType);
      if (!accountId) { addSystemLog('WARN', 'plugin', `[${pluginId}] 平台未连接`); return; }
      const account = accounts.find(a => a.id === accountId);
      if (!account) { addSystemLog('WARN', 'plugin', `[${pluginId}] 未找到账号`); return; }
      await sendPlatformMarkdown(account, t.id, markdown, replyInfo?.msgId, t.type);
    },

    sendKeyboard: async (targetId, targetType, keyboard, content) => {
      const t = resolveTarget(targetId, targetType);
      if (!accountId) { addSystemLog('WARN', 'plugin', `[${pluginId}] 平台未连接`); return; }
      const account = accounts.find(a => a.id === accountId);
      if (!account) { addSystemLog('WARN', 'plugin', `[${pluginId}] 未找到账号`); return; }
      await sendPlatformKeyboard(account, t.id, keyboard, content, replyInfo?.msgId, t.type);
    },

    sendMarkdownKeyboard: async (targetId, targetType, markdown, keyboard) => {
      const t = resolveTarget(targetId, targetType);
      if (!accountId) { addSystemLog('WARN', 'plugin', `[${pluginId}] 平台未连接`); return; }
      const account = accounts.find(a => a.id === accountId);
      if (!account) { addSystemLog('WARN', 'plugin', `[${pluginId}] 未找到账号`); return; }
      await sendPlatformMarkdownWithKeyboard(account, t.id, markdown, keyboard, replyInfo?.msgId, t.type);
    },

    reply: async (text) => {
      const t = resolveTarget();
      await sendAndLog(t.id, t.type, text, replyInfo?.msgId);
    },

    log: (level, message) => {
      addSystemLog(level.toUpperCase() as 'INFO' | 'WARN' | 'ERROR', 'plugin', `[${pluginId}] ${message}`);
    },

    getConnectedAccountId: () => accountId,

    getMessageEvent: () => ({
      message: {
        id: '',
        accountId: accountId || '',
        conversationId: '',
        direction: 'in' as const,
        text: '',
        createdAt: new Date().toISOString(),
      },
      isGroup: replyInfo?.targetType === 'group',
      senderId: replyInfo?.targetId || '',
      senderName: '',
      groupId: replyInfo?.targetType === 'group' ? replyInfo?.targetId : undefined,
    }),
  };
}

export async function ensurePluginsDir(): Promise<void> {
  if (!existsSync(PLUGINS_DIR)) await fs.mkdir(PLUGINS_DIR, { recursive: true });
}

export function getPluginsDir(): string { return PLUGINS_DIR; }