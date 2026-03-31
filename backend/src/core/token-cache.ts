const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export function getCachedToken(accountId: string): { token: string; expiresAt: number } | undefined {
  return tokenCache.get(accountId);
}

export function setCachedToken(accountId: string, token: string, expiresAt: number): void {
  tokenCache.set(accountId, { token, expiresAt });
}

export function clearCachedToken(accountId: string): void {
  tokenCache.delete(accountId);
}
