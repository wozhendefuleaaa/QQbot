import { existsSync, promises as fs } from 'fs';
import path from 'path';
import { Plugin, PluginContext, MessageEvent, CommandDefinition } from './plugin-types.js';
import { addSystemLog, plugins as pluginRegistry, savePluginsToDisk } from './store.js';
import { isYunzaiPlugin, loadYunzaiPlugin, initYunzaiGlobals, convertYunzaiPlugin } from './yunzai/index.js';
import { loadPythonPlugin } from './python-adapter.js';
import {
  PLUGINS_DIR, sharedYunzaiBot, createPluginContext, ensurePluginsDir,
  registerCronJobs, ensurePluginRegistryEntry, persistPluginRegistryIfNeeded,
  loadedPlugins, setHelpCommandCache, buildYunzaiMessageEvent
} from './plugin-core.js';
import { unloadPlugin } from './plugin-lifecycle.js';

async function registerLoadedPlugin(plugin: Plugin, ctx: PluginContext): Promise<boolean> {
  const registry = pluginRegistry.find(p => p.id === plugin.id);
  if (registry && !registry.enabled) {
    addSystemLog('INFO', 'plugin', `插件已禁用，跳过加载: ${plugin.name}`);
    return false;
  }
  if (loadedPlugins.has(plugin.id)) await unloadPlugin(plugin.id);
  if (plugin.onLoad) await plugin.onLoad(ctx);
  registerCronJobs(plugin.id, plugin);
  loadedPlugins.set(plugin.id, plugin);
  const changed = ensurePluginRegistryEntry(plugin);
  await persistPluginRegistryIfNeeded(changed);
  setHelpCommandCache(null);
  return true;
}

function convertYunzaiPluginInstance(instance: any, pluginId: string): Plugin | null {
  if (!instance.rule || !Array.isArray(instance.rule)) return null;
  const convertedPlugin = convertYunzaiPlugin(instance, sharedYunzaiBot);

  const commands: CommandDefinition[] = convertedPlugin.commands.map((cmd: any) => ({
    name: cmd.name, description: cmd.description,
    pattern: typeof cmd.pattern === 'string' ? cmd.pattern : cmd.pattern.source,
    handler: async (_args: string[], event: MessageEvent, ctx: PluginContext) => {
      const yunzaiEvent = buildYunzaiMessageEvent(event, ctx, event.message.id);
      instance.e = yunzaiEvent;
      return cmd.handler(yunzaiEvent);
    }
  }));

  const eventHandlers = convertedPlugin.handlers.map((handlerDef: any) => ({
    event: handlerDef.event,
    handler: async (event: MessageEvent, ctx: PluginContext) => {
      const yunzaiEvent = buildYunzaiMessageEvent(event, ctx, event.message.id);
      instance.e = yunzaiEvent;
      return handlerDef.handler(yunzaiEvent);
    }
  }));

  const cronJobs = convertedPlugin.tasks.map((task: any) => ({
    pattern: task.cron,
    handler: async () => { await task.handler(); }
  }));

  if (commands.length === 0 && eventHandlers.length === 0 && cronJobs.length === 0) return null;

  return {
    id: pluginId, name: instance.name || convertedPlugin.name || pluginId,
    version: '1.0.0', description: instance.dsc || convertedPlugin.description || '',
    enabled: true, priority: instance.priority || 5000,
    commands, eventHandlers, cronJobs,
    onLoad: async () => {
      addSystemLog('INFO', 'plugin', `[云崽] 插件初始化: ${instance.name || pluginId}`);
      if (instance.init && typeof instance.init === 'function') {
        try { await instance.init(); } catch (error) {
          addSystemLog('WARN', 'plugin', `插件初始化失败: ${instance.name || pluginId} - ${error}`);
        }
      }
    },
    dispose: async () => { if (typeof instance.destroy === 'function') await instance.destroy(); }
  };
}

async function loadYunzaiPluginFile(filePath: string, packageName: string): Promise<Plugin | null> {
  try {
    const importPath = `${filePath}?t=${Date.now()}`;
    const module = await import(importPath);
    const YunzaiPlugin = (globalThis as any).plugin;
    if (!YunzaiPlugin) { addSystemLog('WARN', 'plugin', 'YunzaiPlugin 基类未定义'); return null; }

    for (const [exportName, exportedValue] of Object.entries(module)) {
      let pluginInstance: any = null;
      if (typeof exportedValue === 'function') {
        try { pluginInstance = new (exportedValue as any)(); }
        catch { continue; }
      } else if (exportedValue && typeof exportedValue === 'object') {
        pluginInstance = exportedValue;
      }
      if (!pluginInstance?.rule || !Array.isArray(pluginInstance.rule)) continue;

      const pluginId = `${packageName}_${exportName}`;
      const plugin = convertYunzaiPluginInstance(pluginInstance, pluginId);
      if (!plugin) continue;

      const registry = pluginRegistry.find(p => p.id === plugin.id);
      if (registry && !registry.enabled) continue;

      const ctx = createPluginContext(plugin.id);
      const registered = await registerLoadedPlugin(plugin, ctx);
      if (!registered) continue;

      return plugin;
    }
    return null;
  } catch (error) {
    addSystemLog('ERROR', 'plugin', `加载云崽插件文件失败: ${filePath} - ${error}`);
    return null;
  }
}

async function loadPluginPackage(packageDir: string): Promise<void> {
  const packageName = path.basename(packageDir);
  initYunzaiGlobals(sharedYunzaiBot);

  const pkgJsonPath = path.join(packageDir, 'package.json');
  const nodeModulesPath = path.join(packageDir, 'node_modules');
  if (existsSync(pkgJsonPath) && !existsSync(nodeModulesPath)) {
    try {
      const { execSync } = await import('child_process');
      execSync('npm install --legacy-peer-deps', {
        cwd: packageDir, env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: '1' },
        stdio: 'pipe', timeout: 120000
      });
    } catch (error) {
      addSystemLog('WARN', 'plugin', `插件包 ${packageName} 依赖安装失败: ${error}`);
    }
  }

  const entryFiles = ['index.js', 'index.mjs', 'main.js', 'main.mjs', 'app.js', 'app.mjs'];
  let entryFile: string | null = null;
  for (const name of entryFiles) {
    const fp = path.join(packageDir, name);
    if (existsSync(fp)) { entryFile = fp; break; }
  }

  let entryLoadedPlugins = 0;
  if (entryFile) {
    try {
      const loaded = await loadPluginFromFile(entryFile);
      if (Array.isArray(loaded)) entryLoadedPlugins = loaded.length;
      else if (loaded) entryLoadedPlugins = 1;
    } catch (error) {
      addSystemLog('ERROR', 'plugin', `加载插件包入口失败: ${error}`);
    }
  }

  const appsDir = path.join(packageDir, 'apps');
  if (existsSync(appsDir) && entryLoadedPlugins === 0) {
    const appsFiles = await fs.readdir(appsDir);
    for (const file of appsFiles.filter(f => f.endsWith('.js') || f.endsWith('.mjs'))) {
      try { await loadYunzaiPluginFile(path.join(appsDir, file), packageName); }
      catch (error) { addSystemLog('ERROR', 'plugin', `加载 apps 失败: ${error}`); }
    }
  }

  if (!entryFile && !existsSync(appsDir)) {
    addSystemLog('WARN', 'plugin', `插件包 ${packageName} 没有入口文件或 apps`);
  }
}

export async function loadPythonPluginFile(filePath: string): Promise<Plugin | null> {
  try {
    const ctx = createPluginContext(path.basename(filePath, '.py'));
    const plugin = await loadPythonPlugin(filePath, ctx);
    if (!plugin) return null;

    const registry = pluginRegistry.find(p => p.id === plugin.id);
    if (registry && !registry.enabled) return null;
    if (loadedPlugins.has(plugin.id)) await unloadPlugin(plugin.id);
    if (plugin.onLoad) await plugin.onLoad(ctx);
    loadedPlugins.set(plugin.id, plugin);

    if (!registry) {
      pluginRegistry.unshift({
        id: plugin.id, name: plugin.name, enabled: true,
        version: plugin.version, description: plugin.description,
        updatedAt: new Date().toISOString()
      });
      await savePluginsToDisk();
    }
    setHelpCommandCache(null);
    return plugin;
  } catch (error) {
    addSystemLog('ERROR', 'plugin', `加载 Python 插件失败: ${filePath} - ${error}`);
    return null;
  }
}

export async function loadAllPlugins(): Promise<void> {
  await ensurePluginsDir();
  loadedPlugins.clear();

  const seenIds = new Set<string>();
  for (let i = pluginRegistry.length - 1; i >= 0; i--) {
    const item = pluginRegistry[i];
    if (!item?.id || seenIds.has(item.id)) { pluginRegistry.splice(i, 1); continue; }
    seenIds.add(item.id);
  }

  const files = await fs.readdir(PLUGINS_DIR, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(PLUGINS_DIR, file.name);
    try {
      if (file.isDirectory()) { await loadPluginPackage(fullPath); }
      else if (file.isFile() && (file.name.endsWith('.js') || file.name.endsWith('.mjs') || file.name.endsWith('.ts'))) {
        await loadPluginFromFile(fullPath);
      } else if (file.isFile() && file.name.endsWith('.py')) {
        await loadPythonPluginFile(fullPath);
      }
    } catch (error) {
      addSystemLog('ERROR', 'plugin', `加载插件失败: ${file.name} - ${error}`);
    }
  }

  await savePluginsToDisk();
  setHelpCommandCache(null);
  addSystemLog('INFO', 'plugin', `已加载 ${loadedPlugins.size} 个插件`);
}

export async function loadPluginFromFile(filePath: string): Promise<Plugin | Plugin[] | null> {
  try {
    const importPath = `${filePath}?t=${Date.now()}`;
    const module = await import(importPath);

    if (isYunzaiPlugin(module.default) || isYunzaiPlugin(module)) {
      initYunzaiGlobals(sharedYunzaiBot);
      const emptyEvent = (await import('./yunzai/event.js')).createYunzaiEvent(
        { author: { id: '' }, content: '' }, 'default', async () => {}
      );
      const yunzaiPlugin = await loadYunzaiPlugin(filePath, sharedYunzaiBot, emptyEvent);
      if (yunzaiPlugin) {
        const pluginId = path.basename(filePath, path.extname(filePath));
        const plugin = convertYunzaiPluginInstance(yunzaiPlugin, pluginId);
        if (!plugin) return null;
        const registry = pluginRegistry.find(p => p.id === plugin.id);
        if (registry && !registry.enabled) return null;
        const ctx = createPluginContext(plugin.id);
        const registered = await registerLoadedPlugin(plugin, ctx);
        return registered ? plugin : null;
      }
    }

    if (module.apps && typeof module.apps === 'object') {
      initYunzaiGlobals(sharedYunzaiBot);
      const packageName = path.basename(path.dirname(filePath));
      const plugins: Plugin[] = [];
      for (const [exportName, exportedValue] of Object.entries(module.apps)) {
        let pluginInstance: any = null;
        if (typeof exportedValue === 'function') {
          try { pluginInstance = new (exportedValue as any)(); }
          catch { continue; }
        } else if (exportedValue && typeof exportedValue === 'object') {
          pluginInstance = exportedValue;
        }
        if (!pluginInstance?.rule || !Array.isArray(pluginInstance.rule)) continue;
        const pluginId = `${packageName}_${exportName}`;
        const plugin = convertYunzaiPluginInstance(pluginInstance, pluginId);
        if (!plugin) continue;
        const registry = pluginRegistry.find(p => p.id === plugin.id);
        if (registry && !registry.enabled) continue;
        const ctx = createPluginContext(plugin.id);
        const registered = await registerLoadedPlugin(plugin, ctx);
        if (!registered) continue;
        plugins.push(plugin);
      }
      if (plugins.length > 0) {
        await savePluginsToDisk();
        setHelpCommandCache(null);
        return plugins;
      }
    }

    const plugin: Plugin = module.default || module.plugin || (module.id && module.name ? module : null);
    if (!plugin || !plugin.id || !plugin.name) return null;

    const registry = pluginRegistry.find(p => p.id === plugin.id);
    if (registry && !registry.enabled) return null;
    if (loadedPlugins.has(plugin.id)) await unloadPlugin(plugin.id);
    const ctx = createPluginContext(plugin.id);
    if (plugin.onLoad) await plugin.onLoad(ctx);
    loadedPlugins.set(plugin.id, plugin);

    const changed = ensurePluginRegistryEntry(plugin);
    await persistPluginRegistryIfNeeded(changed);
    setHelpCommandCache(null);
    return plugin;
  } catch (error) {
    const errorMessage = String(error);
    const isDependencyError = errorMessage.includes('Cannot find package') ||
      errorMessage.includes('MODULE_NOT_FOUND') ||
      errorMessage.includes('Error: Cannot find module');

    if (isDependencyError) {
      const pluginDir = path.dirname(filePath);
      const pkgJsonPath = path.join(pluginDir, 'package.json');
      if (existsSync(pkgJsonPath)) {
        try {
          const { execSync } = await import('child_process');
          execSync('npm install --production --no-audit --no-fund --legacy-peer-deps', {
            cwd: pluginDir, env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: '1' },
            stdio: 'pipe', timeout: 120000
          });
          const retryImportPath = `${filePath}?t=${Date.now()}_retry`;
          const retryModule = await import(retryImportPath);
          const retryPlugin: Plugin = retryModule.default || retryModule.plugin || (retryModule.id && retryModule.name ? retryModule : null);
          if (retryPlugin?.id && retryPlugin.name) {
            const registry = pluginRegistry.find(p => p.id === retryPlugin.id);
            if (registry && !registry.enabled) return null;
            if (loadedPlugins.has(retryPlugin.id)) await unloadPlugin(retryPlugin.id);
            const ctx = createPluginContext(retryPlugin.id);
            if (retryPlugin.onLoad) await retryPlugin.onLoad(ctx);
            loadedPlugins.set(retryPlugin.id, retryPlugin);
            if (!registry) {
              pluginRegistry.unshift({
                id: retryPlugin.id, name: retryPlugin.name, enabled: true,
                version: retryPlugin.version, description: retryPlugin.description,
                updatedAt: new Date().toISOString()
              });
              await savePluginsToDisk();
            }
            setHelpCommandCache(null);
            return retryPlugin;
          }
        } catch (installError) {
          addSystemLog('ERROR', 'plugin', `依赖安装失败: ${installError}`);
        }
      }
    }
    addSystemLog('ERROR', 'plugin', `加载插件失败: ${filePath} - ${error}`);
    return null;
  }
}