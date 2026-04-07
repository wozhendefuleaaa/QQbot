import { BotAccount } from '../../types.js';
import { addPlatformLog } from '../../core/store.js';
import { callOneBotAction } from '../onebot/server.js';
import { trySendToQQ, recallMessage, uploadImage, sendImageMessage } from './gateway.js';

export type UnifiedSendResult = {
  mode: 'qq_official' | 'onebot_v11';
  platformMessageId?: string | null;
};

export type UnifiedRecallResult = {
  success: boolean;
};

export type UnifiedImageUploadResult = {
  success: boolean;
  fileInfo?: string;
};

export type UnifiedImageSendResult = {
  success: boolean;
  platformMessageId?: string | null;
};

function getPlatformType(account: BotAccount): 'qq_official' | 'onebot_v11' {
  return account.platformType === 'onebot_v11' ? 'onebot_v11' : 'qq_official';
}

function extractOneBotMessageId(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const record = data as Record<string, unknown>;
  const messageId = record.message_id;
  if (typeof messageId === 'string' || typeof messageId === 'number') {
    return String(messageId);
  }

  return null;
}

export async function ensureAccountTransportReady(account: BotAccount): Promise<void> {
  if (getPlatformType(account) === 'onebot_v11') {
    const probe = await callOneBotAction(account.id, 'get_login_info', {}, 5000);
    if (probe.status !== 'ok') {
      throw new Error(probe.msg || probe.wording || 'OneBot 账号未连接');
    }
    return;
  }

  if (account.status !== 'ONLINE') {
    throw new Error('QQ 官方账号未在线');
  }
}

export async function sendTextMessage(
  account: BotAccount,
  targetId: string,
  text: string,
  replyMessageId?: string,
  targetType: 'user' | 'group' | 'channel' | 'dms' = 'user'
): Promise<UnifiedSendResult> {
  if (getPlatformType(account) === 'onebot_v11') {
    const params: Record<string, unknown> = targetType === 'group'
      ? { group_id: targetId, message: text }
      : { user_id: targetId, message: text };

    if (replyMessageId) {
      params.auto_escape = false;
    }

    const action = targetType === 'group' ? 'send_group_msg' : 'send_private_msg';
    const response = await callOneBotAction(account.id, action, params);
    if (response.status !== 'ok') {
      throw new Error(response.msg || response.wording || `OneBot 动作失败: ${action}`);
    }

    const platformMessageId = extractOneBotMessageId(response.data);
    addPlatformLog('INFO', `OneBot 消息发送成功: account=${account.name} target=${targetId} type=${targetType}`);
    return { mode: 'onebot_v11', platformMessageId };
  }

  await trySendToQQ(account, targetId, text, replyMessageId, targetType);
  return {
    mode: 'qq_official',
    platformMessageId: null,
  };
}

export async function recallPlatformMessage(
  account: BotAccount,
  targetId: string,
  messageId: string,
  targetType: 'user' | 'group' | 'channel' | 'dms' = 'user'
): Promise<UnifiedRecallResult> {
  if (getPlatformType(account) === 'onebot_v11') {
    const normalizedMessageId: string | number = /^\d+$/.test(messageId) ? Number(messageId) : messageId;
    const response = await callOneBotAction(account.id, 'delete_msg', {
      message_id: normalizedMessageId,
    });

    if (response.status !== 'ok') {
      return { success: false };
    }

    addPlatformLog('INFO', `OneBot 消息撤回成功: account=${account.name} msg=${messageId}`);
    return { success: true };
  }

  return recallMessage(account, targetId, messageId, targetType);
}

export async function uploadPlatformImage(
  account: BotAccount,
  targetId: string,
  fileBuffer: Buffer,
  fileName: string,
  targetType: 'user' | 'group' = 'user'
): Promise<UnifiedImageUploadResult> {
  if (getPlatformType(account) === 'onebot_v11') {
    const fileBase64 = fileBuffer.toString('base64');
    addPlatformLog('INFO', `OneBot 图片已转换为 base64: account=${account.name} file=${fileName}`);
    return {
      success: true,
      fileInfo: `base64://${fileBase64}`,
    };
  }

  return uploadImage(account, targetId, fileBuffer, fileName, targetType);
}

export async function sendPlatformImageMessage(
  account: BotAccount,
  targetId: string,
  fileInfo: string,
  targetType: 'user' | 'group' = 'user'
): Promise<UnifiedImageSendResult> {
  if (getPlatformType(account) === 'onebot_v11') {
    const action = targetType === 'group' ? 'send_group_msg' : 'send_private_msg';
    const params: Record<string, unknown> = targetType === 'group'
      ? { group_id: targetId, message: [{ type: 'image', data: { file: fileInfo } }] }
      : { user_id: targetId, message: [{ type: 'image', data: { file: fileInfo } }] };

    const response = await callOneBotAction(account.id, action, params);
    if (response.status !== 'ok') {
      return { success: false };
    }

    addPlatformLog('INFO', `OneBot 图片消息发送成功: account=${account.name} target=${targetId}`);
    return {
      success: true,
      platformMessageId: extractOneBotMessageId(response.data),
    };
  }

  const result = await sendImageMessage(account, targetId, fileInfo, targetType);
  return {
    success: result.success,
    platformMessageId: null,
  };
}
