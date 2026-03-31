import { LogLevel, PlatformLog, SystemLog } from '../types.js';
import { id, nowIso } from './utils.js';

export const platformLogs: PlatformLog[] = [];
export const systemLogs: SystemLog[] = [];

export function addPlatformLog(level: LogLevel, message: string) {
  const item: PlatformLog = {
    id: id('log'),
    level,
    message,
    createdAt: nowIso()
  };
  platformLogs.unshift(item);
  if (platformLogs.length > 300) {
    platformLogs.length = 300;
  }
  addSystemLog(level, 'framework', message);
  console.log(`[platform][${level}] ${message}`);
}

export function addSystemLog(level: LogLevel, category: SystemLog['category'], message: string) {
  const item: SystemLog = {
    id: id('slog'),
    level,
    category,
    message,
    createdAt: nowIso()
  };
  systemLogs.unshift(item);
  if (systemLogs.length > 1000) {
    systemLogs.length = 1000;
  }
}
