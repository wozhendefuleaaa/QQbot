import crypto from 'crypto';
import { accounts, addPlatformLog, nowIso } from '../../core/store.js';
import { onebotTokens } from './state.js';
import type { OneBotAuthResult, OneBotTokenRecord } from './types.js';

export function hashOneBotToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateOneBotTokenValue(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function verifyOneBotBearerToken(authHeader: string | undefined): OneBotAuthResult {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: '缺少 Bearer Token' };
  }

  const rawToken = authHeader.slice(7).trim();
  if (!rawToken) {
    return { ok: false, status: 401, error: 'Token 不能为空' };
  }

  const tokenHash = hashOneBotToken(rawToken);
  const token = onebotTokens.find((item) => item.tokenHash === tokenHash);

  if (!token) {
    return { ok: false, status: 401, error: '无效的 OneBot Token' };
  }

  if (!token.enabled) {
    return { ok: false, status: 403, error: 'OneBot Token 已禁用' };
  }

  const account = accounts.find((item) => item.id === token.accountId);
  if (!account) {
    return { ok: false, status: 404, error: 'Token 绑定的账号不存在' };
  }

  token.lastUsedAt = nowIso();
  token.updatedAt = nowIso();
  return { ok: true, token, accountId: token.accountId };
}

export function createOneBotToken(accountId: string, name: string): { record: OneBotTokenRecord; token: string } {
  const rawToken = generateOneBotTokenValue();
  const timestamp = nowIso();
  const record: OneBotTokenRecord = {
    id: `obt_${crypto.randomBytes(6).toString('hex')}`,
    name,
    accountId,
    tokenHash: hashOneBotToken(rawToken),
    enabled: true,
    lastUsedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  onebotTokens.unshift(record);
  addPlatformLog('INFO', `创建 OneBot Token: accountId=${accountId}, tokenId=${record.id}`);
  return { record, token: rawToken };
}
