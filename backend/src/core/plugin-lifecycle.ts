import { promises as fs } from 'fs';
import path from 'path';
import { Plugin, PluginConfig } from './plugin-types.js';
import { addSystemLog } from './store.js';
import { unloadPythonPlugin as unloadPythonPluginProcess } from './python-adapter.js';
import {
  PLUGINS_DIR, loadedPlugins, pluginConfig, disposePluginRuntime, setHelpCommandCache, setPluginConfig
} from './plugin-core.js';

export async function unloadPlugin(pluginId: string): Promise<boolean> {
  const plugin = loadedPlugins.get(pluginId);
  if (!plugin) return false;

  try {
    await disposePluginRuntime(pluginId, plugin);
    if (plugin.onUnload) await plugin.onUnload();
    await unloadPythonPluginProcess(pluginId);
    loadedPlugins.delete(pluginId);
    addSystemLog('INFO', 'plugin', `插件已卸载: ${plugin.name}`);
    setHelpCommandCache(null);
    return true;
  } catch (error) {
    addSystemLog('ERROR', 'plugin', `卸载插件失败: ${pluginId} - ${error}`);
    return false;
  }
}

export async function reloadPlugin(pluginId: string): Promise<Plugin | null> {
  const files = await fs.readdir(PLUGINS_DIR);
  const pluginFiles = files.filter(f =>
    f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.mjs') || f.endsWith('.py')
  );

  for (const file of pluginFiles) {
    const filePath = path.join(PLUGINS_DIR, file);
    try {
      if (file.endsWith('.py')) {
        const { loadPluginFromFile } = await import('./plugin-loader.js');
        const result = await loadPluginFromFile(filePath);
        if (result && (Array.isArray(result) ? result[0]?.id : result.id) === pluginId) {
          return Array.isArray(result) ? result[0] : result;
        }
        continue;
      }

      const importPath = `${filePath}?t=${Date.now()}`;
      const module = await import(importPath);
      const plugin: Plugin = module.default || module.plugin;

      if (plugin && plugin.id === pluginId) {
        const { loadPluginFromFile } = await import('./plugin-loader.js');
        const result = await loadPluginFromFile(filePath);
        if (Array.isArray(result)) return result.find(p => p.id === pluginId) || null;
        return result;
      }
    } catch {
      // ignore errors, continue searching
    }
  }

  return null;
}

export function getLoadedPlugins(): Plugin[] {
  return Array.from(loadedPlugins.values());
}

export function getPluginConfig(): PluginConfig {
  return { ...pluginConfig };
}

export function updatePluginConfig(config: Partial<PluginConfig>): void {
  setPluginConfig({ ...pluginConfig, ...config });
  setHelpCommandCache(null);
}