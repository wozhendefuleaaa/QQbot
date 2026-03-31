import { PlatformStatus } from '../types.js';
import { addPlatformLog } from './logs.js';

export const platformStatus: PlatformStatus = {
  connected: false,
  connecting: false,
  connectedAccountId: null,
  connectedAccountName: null,
  lastConnectedAt: null,
  tokenExpiresAt: null,
  lastError: null
};

export function setPlatformError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  platformStatus.lastError = msg;
  addPlatformLog('ERROR', msg);
}
