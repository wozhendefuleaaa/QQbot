import { accounts } from '../../core/store.js';
import type { OneBotConnectionInfo, OneBotRuntimeConnection, OneBotStatusOverview, OneBotTokenRecord } from './types.js';

export const onebotTokens: OneBotTokenRecord[] = [];
export const onebotConnections = new Map<string, OneBotRuntimeConnection>();
export const onebotAccountConnections = new Map<string, Set<string>>();

let lastOneBotEventAt: string | null = null;

export function setLastOneBotEventAt(timestamp: string | null) {
  lastOneBotEventAt = timestamp;
}

export function getLastOneBotEventAt() {
  return lastOneBotEventAt;
}

export function addOneBotConnection(connection: OneBotRuntimeConnection) {
  onebotConnections.set(connection.connectionId, connection);
  if (!onebotAccountConnections.has(connection.accountId)) {
    onebotAccountConnections.set(connection.accountId, new Set());
  }
  onebotAccountConnections.get(connection.accountId)!.add(connection.connectionId);
}

export function removeOneBotConnection(connectionId: string) {
  const connection = onebotConnections.get(connectionId);
  if (!connection) return;

  onebotConnections.delete(connectionId);
  const ids = onebotAccountConnections.get(connection.accountId);
  if (!ids) return;
  ids.delete(connectionId);
  if (ids.size === 0) {
    onebotAccountConnections.delete(connection.accountId);
  }
}

export function getOneBotConnection(accountId: string): OneBotRuntimeConnection | null {
  const connectionIds = onebotAccountConnections.get(accountId);
  if (!connectionIds || connectionIds.size === 0) {
    return null;
  }
  const latestConnectionId = Array.from(connectionIds)
    .map((connectionId) => onebotConnections.get(connectionId))
    .filter((item): item is OneBotRuntimeConnection => Boolean(item))
    .sort((a, b) => b.connectedAt.localeCompare(a.connectedAt))[0];
  return latestConnectionId || null;
}

export function listOneBotConnections(): OneBotConnectionInfo[] {
  return Array.from(onebotConnections.values()).map(({ socket: _socket, pendingActions: _pendingActions, ...rest }) => rest);
}

export function buildOneBotStatusOverview(): OneBotStatusOverview {
  const accountIds = new Set(listOneBotConnections().map((item) => item.accountId));
  return {
    enabledAccounts: accounts.filter((item) => item.platformType === 'onebot_v11' && item.status !== 'DISABLED').length,
    onlineAccounts: accountIds.size,
    totalConnections: onebotConnections.size,
    lastEventAt: lastOneBotEventAt,
    totalTokens: onebotTokens.length,
    activeTokens: onebotTokens.filter((item) => item.enabled).length,
  };
}
