/**
 * QQ 机器人 SDK 适配层
 * 
 * 将新的 @/core/qqbot SDK 与现有项目代码桥接，
 * 提供向后兼容的函数签名和自动错误处理。
 * 
 * 目标：逐步替换 gateway-core.ts / gateway-message.ts / gateway-utils.ts
 */

import {
  // 类型
  type BotCredentials,
  type ParsedInboundEvent,
  type SendMessageResponse,
  type ReconnectConfig,
  type GatewayCallbacks,
  type GatewayOpcode,
  Intent,
  // 认证
  fetchAccessToken,
  fetchGatewayUrl,
  withAuthRetry,
  clearTokenCache,
  // 消息
  sendTextMessage,
  sendMarkdownMessage,
  sendArkMessage,
  sendEmbedMessage,
  sendKeyboardMessage,
  sendMediaMessage,
  sendMessageWithFallback,
  uploadMedia,
  recallMessage,
  // 事件
  parseGatewayEvent,
  extractSessionId,
  // Gateway
  GatewayClient,
  // 错误
  parseApiError,
  getFriendlyErrorMessage,
  // 常量
  QQ_API_BASE,
  QQ_GATEWAY_API_BASE,
  QQ_AUTH_PREFIX,
} from './index.js';

// 重新导出供外部使用
export { Intent, QQ_API_BASE, QQ_GATEWAY_API_BASE, QQ_AUTH_PREFIX };
export type {
  BotCredentials,
  ParsedInboundEvent,
  SendMessageResponse,
  ReconnectConfig,
  GatewayCallbacks,
};

/**
 * 为现有 BotAccount 创建 BotCredentials
 */
export function credentialsFromAccount(account: {
  appId: string;
  appSecret: string;
}): BotCredentials {
  return {
    appId: account.appId,
    appSecret: account.appSecret,
  };
}

/**
 * 为现有的 fetchAppAccessToken 风格提供兼容包装
 * 
 * 返回 token 字符串，与旧接口兼容
 */
export async function getAccessToken(
  account: { appId: string; appSecret: string },
  forceRefresh = false
): Promise<string> {
  return fetchAccessToken(credentialsFromAccount(account), forceRefresh);
}

/**
 * 统一消息发送 (兼容现有 unified-sender.ts)
 * 
 * @returns { mode: 'qq_official', messageId: string | null }
 */
export async function sendUnifiedText(
  account: { appId: string; appSecret: string },
  targetId: string,
  text: string,
  msgId?: string,
  targetType: 'user' | 'group' = 'user'
): Promise<{ mode: 'qq_official'; messageId: string | null }> {
  const creds = credentialsFromAccount(account);

  try {
    const result = await withAuthRetry(creds, async () =>
      sendMessageWithFallback(creds, targetId, targetType, text, msgId)
    );
    return { mode: 'qq_official', messageId: result.id };
  } catch (error: any) {
    throw new Error(`QQ 消息发送失败: ${error?.message || error}`);
  }
}

/**
 * 统一富媒体发送
 */
export async function sendUnifiedMedia(
  account: { appId: string; appSecret: string },
  targetId: string,
  fileInfo: string,
  targetType: 'user' | 'group' = 'user'
): Promise<{ success: boolean }> {
  const creds = credentialsFromAccount(account);

  try {
    await sendMediaMessage(creds, targetId, fileInfo, targetType);
    return { success: true };
  } catch (error) {
    console.error('[QQBot] 媒体消息发送失败:', error);
    return { success: false };
  }
}

/**
 * 统一图片上传+发送
 */
export async function uploadAndSendImage(
  account: { appId: string; appSecret: string },
  targetId: string,
  fileBuffer: Buffer,
  fileName: string,
  targetType: 'user' | 'group' = 'user'
): Promise<{ success: boolean; fileInfo?: string }> {
  const creds = credentialsFromAccount(account);

  try {
    const fileInfo = await uploadMedia(creds, targetId, fileBuffer, fileName, targetType);
    await sendMediaMessage(creds, targetId, fileInfo, targetType);
    return { success: true, fileInfo };
  } catch (error) {
    console.error('[QQBot] 图片上传发送失败:', error);
    return { success: false };
  }
}

/**
 * 统一消息撤回
 */
export async function recallUnified(
  account: { appId: string; appSecret: string },
  targetId: string,
  messageId: string,
  targetType: 'user' | 'group' = 'user'
): Promise<{ success: boolean }> {
  const creds = credentialsFromAccount(account);

  try {
    const ok = await recallMessage(creds, targetId, messageId, targetType);
    return { success: ok };
  } catch {
    return { success: false };
  }
}

// ==================== Gateway 工具 ====================

/**
 * 创建已配置的 GatewayClient 实例
 * 
 * @param account 机器人账号
 * @param intents 事件订阅位掩码
 * @param callbacks 事件回调
 */
export function createGatewayClient(
  account: { appId: string; appSecret: string },
  intents?: number,
  callbacks?: GatewayCallbacks
): GatewayClient {
  return new GatewayClient(credentialsFromAccount(account), {
    intents,
    callbacks,
  });
}

/**
 * 解析 Gateway 事件的包装器 (兼容现有接口)
 */
export function parseInboundEvent(payload: {
  op?: number;
  s?: number;
  t?: string;
  id?: string;
  d?: unknown;
}): ParsedInboundEvent | null {
  return parseGatewayEvent({
    op: (payload.op ?? 0) as GatewayOpcode,
    s: payload.s,
    t: payload.t,
    id: payload.id,
    d: payload.d,
  });
}

/**
 * 从解析结果提取 session_id
 */
export { extractSessionId as getSessionId };

// ==================== 默认 Intents ====================

import { DEFAULT_INTENTS } from './types.js';

/**
 * 推荐的 intents 配置：
 * - 公域频道消息 (默认)
 * - 频道基础事件 (默认)
 * - 频道成员事件 (默认)
 * - 群聊+单聊 (需申请)
 * - 互动事件 (需申请)
 */
export const RECOMMENDED_INTENTS =
  Intent.PUBLIC_GUILD_MESSAGES |
  Intent.GUILDS |
  Intent.GUILD_MEMBERS |
  Intent.GROUP_AND_C2C_EVENT |
  Intent.INTERACTION;
