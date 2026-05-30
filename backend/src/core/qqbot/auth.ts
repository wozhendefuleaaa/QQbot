/**
 * QQ 机器人认证模块
 * 
 * 负责 AccessToken 的获取、缓存、刷新
 * 基于官方文档：接口调用与鉴权
 */

import {
  AppAccessTokenResponse,
  BotCredentials,
  TokenCache,
} from './types.js';

/** 默认 API 基地址 */
export const QQ_API_BASE = process.env.QQ_API_BASE || 'https://bots.qq.com';
/** 网关 API 基地址（消息发送等） */
export const QQ_GATEWAY_API_BASE =
  process.env.QQ_GATEWAY_API_BASE || 'https://api.sgroup.qq.com';
/** Gateway URL（可环境变量预设） */
export const QQ_GATEWAY_URL = process.env.QQ_GATEWAY_URL || '';
/** Authorization 头前缀 */
export const QQ_AUTH_PREFIX = process.env.QQ_AUTH_PREFIX || 'QQBot';

/** Token 缓存 Map<appId, TokenCache> */
const tokenCache = new Map<string, TokenCache>();

/**
 * 获取 AppAccessToken
 * POST https://bots.qq.com/app/getAppAccessToken
 * 
 * @param credentials 机器人凭证
 * @param forceRefresh 是否强制刷新
 * @returns access_token 字符串
 */
export async function fetchAccessToken(
  credentials: BotCredentials,
  forceRefresh = false
): Promise<string> {
  const { appId, appSecret } = credentials;
  const now = Date.now();

  // 检查缓存
  if (!forceRefresh) {
    const cached = tokenCache.get(appId);
    if (cached && cached.expiresAt - now > 60_000) {
      return cached.token;
    }
  }

  if (!appId || !appSecret) {
    throw new Error('缺少 AppID 或 AppSecret');
  }

  const url = `${QQ_API_BASE}/app/getAppAccessToken`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId, clientSecret: appSecret }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`获取 AccessToken 失败: HTTP ${res.status}${detail ? ` ${detail.slice(0, 200)}` : ''}`);
  }

  const data = (await res.json()) as AppAccessTokenResponse;
  const token = data.access_token || data.accessToken;
  const expiresIn = Number(data.expires_in || data.expiresIn || 7200);

  if (!token) {
    throw new Error('AccessToken 响应缺少 access_token 字段');
  }

  const expiresAt = Date.now() + expiresIn * 1000;
  tokenCache.set(appId, { token, expiresAt });

  return token;
}

/**
 * 生成 Authorization 请求头
 */
export function authHeaders(credentials: { appId: string }, token: string): Record<string, string> {
  return {
    Authorization: `${QQ_AUTH_PREFIX} ${token}`,
    'X-Union-Appid': credentials.appId,
  };
}

/**
 * 安全执行 API 调用，401 时自动刷新 token 重试
 * 
 * @param credentials 机器人凭证
 * @param fn API 调用函数（接收当前 token）
 * @param retries 最大重试次数
 */
export async function withAuthRetry<T>(
  credentials: BotCredentials,
  fn: (token: string) => Promise<T>,
  retries = 1
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const forceRefresh = attempt > 0;
    const token = await fetchAccessToken(credentials, forceRefresh);
    try {
      return await fn(token);
    } catch (error: any) {
      const msg = error?.message || String(error);
      const isAuthError =
        msg.includes('401') ||
        msg.includes('403') ||
        msg.includes('token') ||
        msg.includes('Token') ||
        msg.includes('鉴权') ||
        msg.includes('认证');

      if (isAuthError && attempt < retries) {
        // 清除缓存，下次强制刷新
        tokenCache.delete(credentials.appId);
        continue;
      }
      throw error;
    }
  }
  throw new Error('认证重试失败');
}

/**
 * 清除指定 AppId 的 Token 缓存
 */
export function clearTokenCache(appId: string): void {
  tokenCache.delete(appId);
}

/**
 * 清除所有 Token 缓存
 */
export function clearAllTokenCache(): void {
  tokenCache.clear();
}

/**
 * 获取网关地址
 */
export async function fetchGatewayUrl(token: string, appId: string): Promise<string> {
  if (QQ_GATEWAY_URL) {
    return QQ_GATEWAY_URL;
  }

  const baseCandidates = [
    QQ_GATEWAY_API_BASE,
    'https://api.sgroup.qq.com',
    'https://sandbox.api.sgroup.qq.com',
  ]
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const errors: string[] = [];

  for (const base of baseCandidates) {
    const url = `${base.replace(/\/$/, '')}/gateway/bot`;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, {
          headers: authHeaders({ appId }, token),
        });

        if (res.ok) {
          const data = (await res.json()) as { url?: string };
          if (data.url) return data.url;
          errors.push(`${url} -> 响应缺少 url 字段`);
        } else {
          const detail = await res.text().catch(() => '');
          errors.push(`${url} -> HTTP ${res.status}${detail ? ` ${detail.slice(0, 200)}` : ''}`);
        }
      } catch (error) {
        errors.push(`${url} -> ${error instanceof Error ? error.message : String(error)}`);
      }

      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 3000 + attempt * 1000));
      }
    }
  }

  throw new Error(`获取 Gateway 地址失败: ${errors.join(' ; ')}`);
}
