import path from 'path';
import { PluginInfo } from '../../types.js';
import { dataDir, readJsonFile, writeJsonFile } from './base.js';
import { id, nowIso } from '../utils.js';

const pluginsFilePath = path.join(dataDir, 'plugins.json');
export const plugins: PluginInfo[] = [];

export async function loadPluginsFromDisk() {
  const parsed = await readJsonFile<PluginInfo[]>(pluginsFilePath);
  if (Array.isArray(parsed)) {
    plugins.splice(0, plugins.length, ...parsed.filter((x) => x?.id && x?.name));
  }
  if (plugins.length === 0) {
    plugins.push({
      id: id('plg'),
      name: 'system-echo',
      enabled: true,
      version: '1.0.0',
      description: '示例插件：回显消息日志',
      updatedAt: nowIso()
    });
    await savePluginsToDisk();
  }
}

export async function savePluginsToDisk() {
  await writeJsonFile(pluginsFilePath, plugins);
}
