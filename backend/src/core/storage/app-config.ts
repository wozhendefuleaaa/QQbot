import { AppConfig } from '../../types.js';
import { getDatabase } from './sqlite.js';
import { nowIso } from '../utils.js';
import { gatewayIntents } from '../config.js';

export const appConfig: AppConfig = {
  webName: 'QQBot Console',
  notice: '欢迎使用 QQ 机器人控制台。',
  allowOpenApi: true,
  defaultIntent: gatewayIntents,
  pluginPermissions: {},
  yunzaiPermission: {
    masterIds: [],
    adminIds: []
  },
  updatedAt: nowIso()
};

export async function loadAppConfigFromDisk() {
  const db = getDatabase();
  const configs = db.prepare('SELECT * FROM app_config').all();
  
  const configMap = new Map<string, string>();
  configs.forEach((config: any) => {
    configMap.set(config.key, config.value);
  });
  
  // 加载基本配置
  if (configMap.has('webName')) {
    appConfig.webName = configMap.get('webName') || appConfig.webName;
  }
  if (configMap.has('notice')) {
    appConfig.notice = configMap.get('notice') || appConfig.notice;
  }
  if (configMap.has('allowOpenApi')) {
    appConfig.allowOpenApi = JSON.parse(configMap.get('allowOpenApi') || 'true');
  }
  if (configMap.has('defaultIntent')) {
    appConfig.defaultIntent = Number(configMap.get('defaultIntent') || gatewayIntents);
  }
  
  appConfig.updatedAt = nowIso();
}

export async function saveAppConfigToDisk() {
  const db = getDatabase();
  const insert = db.prepare(`
    INSERT OR REPLACE INTO app_config (key, value)
    VALUES (?, ?)
  `);
  
  insert.run('webName', appConfig.webName);
  insert.run('notice', appConfig.notice);
  insert.run('allowOpenApi', JSON.stringify(appConfig.allowOpenApi));
  insert.run('defaultIntent', appConfig.defaultIntent.toString());
  
  appConfig.updatedAt = nowIso();
}

export async function getAppConfig() {
  return appConfig;
}

export async function updateAppConfig(updates: Partial<AppConfig>) {
  Object.assign(appConfig, updates);
  await saveAppConfigToDisk();
  return appConfig;
}
