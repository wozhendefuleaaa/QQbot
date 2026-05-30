import { Plugin, PluginConfig, MessageEvent, CommandDefinition, CommandPermission } from './plugin-types.js';
import { addSystemLog, appConfig, platformStatus } from './store.js';
import {
  pluginConfig, loadedPlugins, sharedYunzaiBot, commandCooldowns, setHelpCommandCache,
  createPluginContext, buildYunzaiMessageEvent
} from './plugin-core.js';

function isPluginDisabled(pluginId: string, accountId: string | null, groupId: string | undefined): boolean {
  if (!accountId) return false;
  const effectiveGroupId = groupId || 'private';
  const permMatrix = appConfig.pluginPermissions[accountId];
  if (!permMatrix) return false;
  if (!permMatrix.groups.includes(effectiveGroupId)) return false;
  const disabledList = permMatrix.disabledPlugins[effectiveGroupId];
  if (!disabledList) return false;
  return disabledList.includes(pluginId);
}

function checkPermission(permission: CommandPermission, senderId: string, config: PluginConfig): boolean {
  if (permission === 'public') return true;
  if (permission === 'admin') return config.adminUserIds.includes(senderId) || (config.ownerIds?.includes(senderId) ?? false);
  if (permission === 'owner') return config.ownerIds?.includes(senderId) ?? false;
  return true;
}

function checkCooldown(cmdName: string, senderId: string, cooldown: number | undefined): { allowed: boolean; remaining: number } {
  if (!cooldown || cooldown <= 0) return { allowed: true, remaining: 0 };
  const key = `${cmdName}:${senderId}`;
  const lastUsed = commandCooldowns.get(key);
  if (!lastUsed) return { allowed: true, remaining: 0 };
  const elapsed = (Date.now() - lastUsed) / 1000;
  if (elapsed >= cooldown) return { allowed: true, remaining: 0 };
  return { allowed: false, remaining: Math.ceil(cooldown - elapsed) };
}

function recordCommandUse(cmdName: string, senderId: string): void {
  commandCooldowns.set(`${cmdName}:${senderId}`, Date.now());
}

function getAvailableCommands(): Array<{ plugin: string; command: CommandDefinition }> {
  const result: Array<{ plugin: string; command: CommandDefinition }> = [];
  for (const plugin of loadedPlugins.values()) {
    if (plugin.enabled !== false && plugin.commands) {
      for (const cmd of plugin.commands) result.push({ plugin: plugin.name, command: cmd });
    }
  }
  return result;
}

async function generateHelpText(helpCache: string | null): Promise<string> {
  if (helpCache) return helpCache;
  const commands = getAvailableCommands();
  const prefix = pluginConfig.commandPrefix;
  const lines: string[] = ['📖 可用命令列表：', ''];
  for (const { plugin, command } of commands) {
    if (command.hidden) continue;
    const permLabel = command.permission === 'admin' ? ' [管理员]' : command.permission === 'owner' ? ' [所有者]' : '';
    const aliases = command.aliases?.length ? ` (${command.aliases.join(', ')})` : '';
    lines.push(`${prefix}${command.name}${aliases}${permLabel}`);
    lines.push(`  ${command.description}`);
    if (command.usage) lines.push(`  用法: ${command.usage}`);
  }
  lines.push('', `共 ${commands.filter(c => !c.command.hidden).length} 个命令`);
  const text = lines.join('\n');
  setHelpCommandCache(text);
  return text;
}

async function sendPlatformText(targetId: string, targetType: 'user' | 'group', text: string, msgId?: string, accountId?: string): Promise<void> {
  const { sendTextMessage } = await import('../modules/platform/unified-sender.js');
  const { accounts } = await import('./store.js');
  const effectiveAccountId = accountId || platformStatus.connectedAccountId;
  if (!effectiveAccountId) return;
  const account = accounts.find(a => a.id === effectiveAccountId);
  if (!account) return;
  await sendTextMessage(account, targetId, text, msgId, targetType);
}

async function handleCommand(
  commands: CommandDefinition[], text: string, event: MessageEvent, ctx: ReturnType<typeof createPluginContext>
): Promise<boolean> {
  const prefix = pluginConfig.commandPrefix;

  if (text === `${prefix}help` || text === `${prefix}帮助` || text === 'help' || text === '帮助') {
    const helpText = await generateHelpText(null);
    const targetId = event.isGroup ? event.groupId : event.senderId;
    const targetType = event.isGroup ? 'group' : 'user';
    await ctx.sendMessage(targetId || '', targetType, helpText);
    return true;
  }

  for (const cmd of commands) {
    if (cmd.pattern) {
      const regex = typeof cmd.pattern === 'string' ? new RegExp(cmd.pattern) : cmd.pattern;
      if (regex.test(text)) {
        if (!checkPermission(cmd.permission || 'public', event.senderId, pluginConfig)) {
          await ctx.sendMessage(event.isGroup ? event.groupId || '' : event.senderId, event.isGroup ? 'group' : 'user', '⚠️ 您没有权限执行此命令');
          return true;
        }
        const cooldownCheck = checkCooldown(cmd.name, event.senderId, cmd.cooldown);
        if (!cooldownCheck.allowed) {
          await ctx.sendMessage(event.isGroup ? event.groupId || '' : event.senderId, event.isGroup ? 'group' : 'user', `⏳ 命令冷却中，请等待 ${cooldownCheck.remaining} 秒`);
          return true;
        }
        const args = text.split(/\s+/).filter(Boolean);
        try {
          const result = await cmd.handler(args, event, ctx);
          if (typeof result === 'string' && result) {
            await ctx.sendMessage(event.isGroup ? event.groupId || '' : event.senderId, event.isGroup ? 'group' : 'user', result);
          }
          recordCommandUse(cmd.name, event.senderId);
          return true;
        } catch (error) {
          await ctx.sendMessage(event.isGroup ? event.groupId || '' : event.senderId, event.isGroup ? 'group' : 'user', `❌ 命令执行失败: ${error}`);
          return true;
        }
      }
    }

    for (const name of [cmd.name, ...(cmd.aliases || [])]) {
      const cmdWithPrefix = `${prefix}${name}`;
      let matched = false;
      let argsStartIndex = 0;
      if (text === cmdWithPrefix || text.startsWith(`${cmdWithPrefix} `)) { matched = true; argsStartIndex = cmdWithPrefix.length; }
      else if (text === name || text.startsWith(`${name} `)) { matched = true; argsStartIndex = name.length; }
      if (!matched) continue;

      if (!checkPermission(cmd.permission || 'public', event.senderId, pluginConfig)) {
        await ctx.sendMessage(event.isGroup ? event.groupId || '' : event.senderId, event.isGroup ? 'group' : 'user', '⚠️ 您没有权限执行此命令');
        return true;
      }
      const cooldownCheck = checkCooldown(cmd.name, event.senderId, cmd.cooldown);
      if (!cooldownCheck.allowed) {
        await ctx.sendMessage(event.isGroup ? event.groupId || '' : event.senderId, event.isGroup ? 'group' : 'user', `⏳ 命令冷却中，请等待 ${cooldownCheck.remaining} 秒`);
        return true;
      }
      const args = text.slice(argsStartIndex).trim().split(/\s+/).filter(Boolean);
      try {
        const result = await cmd.handler(args, event, ctx);
        if (typeof result === 'string' && result) {
          await ctx.sendMessage(event.isGroup ? event.groupId || '' : event.senderId, event.isGroup ? 'group' : 'user', result);
        }
        recordCommandUse(cmd.name, event.senderId);
        return true;
      } catch (error) {
        await ctx.sendMessage(event.isGroup ? event.groupId || '' : event.senderId, event.isGroup ? 'group' : 'user', `❌ 命令执行失败: ${error}`);
        return true;
      }
    }
  }
  return false;
}

export async function dispatchMessage(message: import('../types.js').Message, peerId?: string, peerType?: 'user' | 'group', inboundMsgId?: string): Promise<boolean> {
  const isGroup = peerType === 'group' || message.conversationId.includes('_group_');
  const senderId = peerId || (message.direction === 'in' ? message.conversationId.split('_').pop() || '' : '');

  const event: MessageEvent = {
    message, isGroup, senderId,
    groupId: isGroup ? (peerId || message.conversationId.split('_')[1]) : undefined,
    senderName: senderId
  };

  if (isGroup && !pluginConfig.allowGroup) return false;
  if (!isGroup && !pluginConfig.allowPrivate) return false;

  const currentAccountId = message.accountId || platformStatus.connectedAccountId;

  const sortedPlugins = Array.from(loadedPlugins.values())
    .filter(p => p.enabled !== false)
    .filter(p => !isPluginDisabled(p.id, currentAccountId, event.groupId))
    .sort((a, b) => (a.priority || 100) - (b.priority || 100));

  const replyInfo = {
    accountId: currentAccountId || undefined,
    targetId: peerId || senderId,
    targetType: (isGroup ? 'group' : 'user') as 'user' | 'group',
    msgId: inboundMsgId
  };

  sharedYunzaiBot.emit('message', event);
  sharedYunzaiBot.emit(isGroup ? 'message.group' : 'message.private', event);
  if (isGroup) sharedYunzaiBot.emit('message.group.normal', event);

  const yunzaiRuntimeEvent = (await import('./yunzai/event.js')).createYunzaiEvent(
    {
      id: inboundMsgId || message.id,
      content: message.text,
      group_id: isGroup ? (peerId || event.groupId || '') : undefined,
      channel_id: undefined, guild_id: undefined,
      group_name: isGroup ? `群聊${peerId || event.groupId || ''}` : undefined,
      author: { id: senderId, username: senderId, avatar: '' },
      member: isGroup ? { nick: senderId, roles: [] } : undefined,
      mentions: []
    },
    currentAccountId || 'default',
    async (targetId, targetType, text, msgId) => {
      await sendPlatformText(targetId, targetType, text, msgId, currentAccountId || undefined);
    }
  );
  sharedYunzaiBot.emit(isGroup ? 'message.group.raw' : 'message.private.raw', yunzaiRuntimeEvent);

  for (const plugin of sortedPlugins) {
    try {
      const ctx = createPluginContext(plugin.id, replyInfo);

      if (plugin.commands) {
        const handled = await handleCommand(plugin.commands, message.text.trim(), event, ctx);
        if (handled) return true;
      }

      if (plugin.eventHandlers?.length) {
        for (const handler of plugin.eventHandlers) {
          const ne = handler.event.toLowerCase();
          const shouldRun = ne === 'message' || ne === (isGroup ? 'message.group' : 'message.private')
            || (isGroup && ne === 'message.group.normal');
          if (!shouldRun) continue;
          const result = await handler.handler(event, ctx);
          if (result === true) return true;
        }
      }

      if (plugin.onMessage) {
        const result = await plugin.onMessage(event, ctx);
        if (result === true) return true;
      }
    } catch (error) {
      addSystemLog('ERROR', 'plugin', `插件处理消息失败: ${plugin.id} - ${error}`);
    }
  }

  return false;
}

export { getAvailableCommands };

export function cleanupCooldowns(): void {
  const now = Date.now();
  for (const [key, timestamp] of commandCooldowns.entries()) {
    if (now - timestamp > 3600000) commandCooldowns.delete(key);
  }
}

setInterval(cleanupCooldowns, 600000);