import { BotAccount } from '../../types.js';
import { addPlatformLog } from '../../core/store.js';
import { callOneBotAction } from '../onebot/server.js';
import { trySendToQQ, recallMessage, uploadImage, sendImageMessage } from './gateway.js';
import {
  sendMarkdownMessage as sdkSendMarkdown,
  sendMarkdownWithKeyboard as sdkSendMarkdownWithKeyboard,
  sendArkMessage as sdkSendArk,
  sendEmbedMessage as sdkSendEmbed,
  sendKeyboardMessage as sdkSendKeyboard,
  sendMediaMessage as sdkSendMedia,
  uploadMedia as sdkUploadMedia,
} from '../../core/qqbot/index.js';
import type { KeyboardPayload } from '../../core/qqbot/types.js';
import { MessageBuilder } from '../../core/qqbot/segment.js';

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

// ==================== 富媒体消息 (使用新版 SDK) ====================

/**
 * 发送 Markdown 消息 (QQ Official)
 */
export async function sendPlatformMarkdown(
  account: BotAccount,
  targetId: string,
  markdown: { custom_template_id?: string; params?: Array<{ key: string; values: string[] }> },
  msgId?: string,
  targetType: 'user' | 'group' = 'user'
): Promise<{ success: boolean }> {
  if (account.platformType === 'onebot_v11') {
    addPlatformLog('WARN', 'OneBot 不支持 Markdown 消息');
    return { success: false };
  }

  try {
    await sdkSendMarkdown(
      { appId: account.appId, appSecret: account.appSecret },
      targetId,
      markdown,
      msgId,
      targetType
    );
    addPlatformLog('INFO', `Markdown 消息发送成功: target=${targetId}`);
    return { success: true };
  } catch (error: any) {
    addPlatformLog('ERROR', `Markdown 消息发送失败: ${error?.message}`);
    return { success: false };
  }
}

/**
 * 发送 Ark 卡片消息 (QQ Official)
 */
export async function sendPlatformArk(
  account: BotAccount,
  targetId: string,
  ark: { template_id: number; kv: Array<{ key: string; value?: string }> },
  msgId?: string,
  targetType: 'user' | 'group' = 'user'
): Promise<{ success: boolean }> {
  if (account.platformType === 'onebot_v11') {
    addPlatformLog('WARN', 'OneBot 不支持 Ark 消息');
    return { success: false };
  }

  try {
    await sdkSendArk(
      { appId: account.appId, appSecret: account.appSecret },
      targetId,
      ark,
      msgId,
      targetType
    );
    addPlatformLog('INFO', `Ark 消息发送成功: target=${targetId}`);
    return { success: true };
  } catch (error: any) {
    addPlatformLog('ERROR', `Ark 消息发送失败: ${error?.message}`);
    return { success: false };
  }
}

/**
 * 使用 MessageBuilder 发送消息 (QQ Official)
 * 
 * 支持链式API构建复杂消息：文本 + @ + 表情 + 回复等
 */
export async function sendPlatformMessage(
  account: BotAccount,
  targetId: string,
  builder: MessageBuilder,
  targetType: 'user' | 'group' = 'user'
): Promise<{ success: boolean; messageId?: string | null }> {
  if (account.platformType === 'onebot_v11') {
    const text = builder.buildText();
    const action = targetType === 'group' ? 'send_group_msg' : 'send_private_msg';
    const params: Record<string, unknown> =
      targetType === 'group'
        ? { group_id: targetId, message: text }
        : { user_id: targetId, message: text };

    const response = await callOneBotAction(account.id, action, params);
    if (response.status !== 'ok') {
      return { success: false };
    }
    return { success: true, messageId: extractOneBotMessageId(response.data) };
  }

  try {
    const request = builder.build();
    let result: { id: string; timestamp: number };

    if (request.msg_type === 2) {
      result = await sdkSendMarkdown(
        { appId: account.appId, appSecret: account.appSecret },
        targetId,
        request.markdown!,
        request.msg_id,
        targetType
      );
    } else if (request.msg_type === 7) {
      result = await sdkSendMedia(
        { appId: account.appId, appSecret: account.appSecret },
        targetId,
        request.media!.file_info,
        targetType
      );
    } else {
      // 处理文本消息（可能带 keyboard）
      if (request.keyboard) {
        result = await sdkSendKeyboard(
          { appId: account.appId, appSecret: account.appSecret },
          targetId,
          request.keyboard,
          request.content || '',
          request.msg_id,
          targetType
        );
      } else {
        result = await trySendToQQ(account, targetId, request.content || '', request.msg_id, targetType) as any;
      }
    }

    addPlatformLog('INFO', `消息发送成功: target=${targetId} msgId=${result?.id || ''}`);
    return { success: true, messageId: result?.id || null };
  } catch (error: any) {
    addPlatformLog('ERROR', `消息发送失败: ${error?.message}`);
    return { success: false };
  }
}

/**
 * 使用新 SDK 上传媒体文件
 */
export async function uploadPlatformMedia(
  account: BotAccount,
  targetId: string,
  fileBuffer: Buffer,
  fileName: string,
  targetType: 'user' | 'group' = 'user'
): Promise<{ success: boolean; fileInfo?: string }> {
  if (account.platformType === 'onebot_v11') {
    const fileBase64 = fileBuffer.toString('base64');
    return { success: true, fileInfo: `base64://${fileBase64}` };
  }

  try {
    const fileInfo = await sdkUploadMedia(
      { appId: account.appId, appSecret: account.appSecret },
      targetId,
      fileBuffer,
      fileName,
      targetType
    );
    return { success: true, fileInfo };
  } catch (error: any) {
    addPlatformLog('ERROR', `媒体上传失败: ${error?.message}`);
    return { success: false };
  }
}

/**
 * 发送键盘按钮消息 (QQ Official)
 * 
 * @param content 可选文本内容，键盘按钮会附带文本一起发送
 */
export async function sendPlatformKeyboard(
  account: BotAccount,
  targetId: string,
  keyboard: KeyboardPayload,
  content?: string,
  msgId?: string,
  targetType: 'user' | 'group' = 'user'
): Promise<{ success: boolean }> {
  if (account.platformType === 'onebot_v11') {
    addPlatformLog('WARN', 'OneBot 不支持键盘消息');
    return { success: false };
  }

  try {
    await sdkSendKeyboard(
      { appId: account.appId, appSecret: account.appSecret },
      targetId,
      keyboard,
      content,
      msgId,
      targetType
    );
    addPlatformLog('INFO', `键盘消息发送成功: target=${targetId}`);
    return { success: true };
  } catch (error: any) {
    addPlatformLog('ERROR', `键盘消息发送失败: ${error?.message}`);
    return { success: false };
  }
}

/**
 * 发送 Markdown + 键盘组合消息 (QQ Official)
 * 
 * 官方支持 Markdown 消息附加按钮组件
 */
export async function sendPlatformMarkdownWithKeyboard(
  account: BotAccount,
  targetId: string,
  markdown: { custom_template_id?: string; params?: Array<{ key: string; values: string[] }> },
  keyboard: KeyboardPayload,
  msgId?: string,
  targetType: 'user' | 'group' = 'user'
): Promise<{ success: boolean }> {
  if (account.platformType === 'onebot_v11') {
    addPlatformLog('WARN', 'OneBot 不支持 Markdown/键盘消息');
    return { success: false };
  }

  try {
    await sdkSendMarkdownWithKeyboard(
      { appId: account.appId, appSecret: account.appSecret },
      targetId,
      markdown,
      keyboard,
      msgId,
      targetType
    );
    addPlatformLog('INFO', `Markdown+键盘消息发送成功: target=${targetId}`);
    return { success: true };
  } catch (error: any) {
    addPlatformLog('ERROR', `Markdown+键盘消息发送失败: ${error?.message}`);
    return { success: false };
  }
}
