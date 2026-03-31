import { BotAccount, PublicBotAccount } from '../types.js';

export const nowIso = () => new Date().toISOString();
export const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
export const maskSecret = (input: string) => `${input.slice(0, 2)}***${input.slice(-2)}`;

export function toPublicAccount(account: BotAccount): PublicBotAccount {
  const { appSecret: _appSecret, ...rest } = account;
  return rest;
}
