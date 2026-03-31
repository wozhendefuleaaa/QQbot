import { BotAccount } from '../types.js';
import { addPlatformLog } from './logs.js';
import { platformStatus } from './platform-status.js';
import { getCachedToken, setCachedToken } from './token-cache.js';
import { qqApiBase } from './config.js';

export async function fetchAppAccessToken(account: BotAccount, forceRefresh = false) {
  const now = Date.now();
  const cached = getCachedToken(account.id);
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
  setCachedToken(account.id, token, expiresAt);
  platformStatus.tokenExpiresAt = new Date(expiresAt).toISOString();
  addPlatformLog('INFO', `AccessToken 获取成功（账号：${account.name}）`);
  return token;
}
