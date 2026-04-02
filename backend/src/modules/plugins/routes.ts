import { Express } from 'express';
import { PluginInfo } from '../../types.js';
import { addSystemLog, id, nowIso, plugins, savePluginsToDisk } from '../../core/store.js';
import {
  getLoadedPlugins,
  getAvailableCommands,
  loadPluginFromFile,
  reloadPlugin,
  unloadPlugin,
  getPluginConfig,
  updatePluginConfig,
  getPluginsDir
} from '../../core/plugin-manager.js';
import fs from 'fs';
import path from 'path';

export function registerPluginRoutes(app: Express) {
  // 获取插件源码
  app.get('/plugins/:id/source', async (req, res) => {
    try {
      const pluginId = req.params.id;
      const PLUGINS_DIR = getPluginsDir();
      
      // 处理云崽插件的特殊ID格式（如 test-yunzai-plugins-0, test-yunzai-plugins-1 等）
      // 这些插件来自同一个文件，需要提取原始文件名
      let basePluginId = pluginId;
      const yunzaiMatch = pluginId.match(/^(.+)-(\d+)$/);
      if (yunzaiMatch) {
        // 检查是否存在对应的基础文件
        const baseName = yunzaiMatch[1];
        const baseTsFile = path.join(PLUGINS_DIR, `${baseName}.ts`);
        const baseJsFile = path.join(PLUGINS_DIR, `${baseName}.js`);
        if (fs.existsSync(baseTsFile) || fs.existsSync(baseJsFile)) {
          basePluginId = baseName;
        }
      }
      
      const pluginFile = path.join(PLUGINS_DIR, `${basePluginId}.ts`);
      const jsPluginFile = path.join(PLUGINS_DIR, `${basePluginId}.js`);
      
      let filePath = '';
      if (fs.existsSync(pluginFile)) {
        filePath = pluginFile;
      } else if (fs.existsSync(jsPluginFile)) {
        filePath = jsPluginFile;
      } else {
        res.status(404).json({ error: '插件文件不存在' });
        return;
      }
      
      const source = fs.readFileSync(filePath, 'utf-8');
      res.json({ source, filename: path.basename(filePath) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 上传插件
  app.post('/plugins/upload', async (req, res) => {
    try {
      const { filename, content } = req.body as { filename?: string; content?: string };
      const PLUGINS_DIR = getPluginsDir();

      if (!filename || !content) {
        res.status(400).json({ error: 'filename 和 content 为必填项' });
        return;
      }

      // 安全检查：防止路径遍历攻击
      const safeName = path.basename(filename).replace(/\.\.+/g, '');
      if (!safeName.endsWith('.ts') && !safeName.endsWith('.js')) {
        res.status(400).json({ error: '只支持 .ts 或 .js 文件' });
        return;
      }

      const filePath = path.join(PLUGINS_DIR, safeName);
      
      // 检查是否已存在
      if (fs.existsSync(filePath)) {
        res.status(409).json({ error: '同名插件文件已存在' });
        return;
      }
      
      // 写入文件
      fs.writeFileSync(filePath, content, 'utf-8');
      
      // 从文件名提取插件ID（去掉扩展名）
      const pluginId = safeName.replace(/\.(ts|js)$/, '');
      
      // 尝试加载插件
      const loadedPlugin = await loadPluginFromFile(filePath);
      
      if (loadedPlugin) {
        // 处理单个插件或插件数组
        const pluginArray = Array.isArray(loadedPlugin) ? loadedPlugin : [loadedPlugin];
        
        for (const plugin of pluginArray) {
          // 检查是否已存在于 plugins 数组中
          const existingIndex = plugins.findIndex(p => p.id === plugin.id);
          if (existingIndex < 0) {
            // 添加到 plugins 数组
            const newPluginInfo: PluginInfo = {
              id: plugin.id,
              name: plugin.name,
              version: plugin.version || '1.0.0',
              description: plugin.description || '',
              author: plugin.author || 'Unknown',
              enabled: true,
              priority: plugin.priority || 50,
              updatedAt: nowIso()
            };
            plugins.push(newPluginInfo);
          }
          addSystemLog('INFO', 'plugin', `已上传并加载插件：${plugin.name} (${safeName})`);
        }
        
        savePluginsToDisk();
        const firstPlugin = pluginArray[0];
        res.status(201).json({ id: firstPlugin.id, filename: safeName, loaded: true, count: pluginArray.length });
      } else {
        addSystemLog('WARN', 'plugin', `已上传插件文件但加载失败：${safeName}`);
        res.status(201).json({ id: pluginId, filename: safeName, loaded: false });
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 保存/更新插件源码
  app.put('/plugins/:id/source', async (req, res) => {
    try {
      const { content } = req.body as { content?: string };
      const PLUGINS_DIR = getPluginsDir();

      if (!content) {
        res.status(400).json({ error: 'content 为必填项' });
        return;
      }

      const pluginId = req.params.id;
      const tsFile = path.join(PLUGINS_DIR, `${pluginId}.ts`);
      const jsFile = path.join(PLUGINS_DIR, `${pluginId}.js`);
      
      let filePath = '';
      if (fs.existsSync(tsFile)) {
        filePath = tsFile;
      } else if (fs.existsSync(jsFile)) {
        filePath = jsFile;
      } else {
        // 默认创建 .ts 文件
        filePath = tsFile;
      }
      
      fs.writeFileSync(filePath, content, 'utf-8');
      
      addSystemLog('INFO', 'plugin', `已保存插件源码：${path.basename(filePath)}`);
      res.json({ success: true, filename: path.basename(filePath) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 获取插件注册表（合并已加载插件的详细信息）
  app.get('/plugins', (_req, res) => {
    const loaded = getLoadedPlugins();
    const loadedMap = new Map(loaded.map(p => [p.id, p]));
    const registeredMap = new Map(plugins.map(p => [p.id, p]));
    
    // 首先处理已注册的插件（来自 plugins.json）
    const mergedPlugins = plugins.map(p => {
      const loadedPlugin = loadedMap.get(p.id);
      return {
        ...p,
        loaded: !!loadedPlugin,
        author: loadedPlugin?.author ?? p.author,
        priority: loadedPlugin?.priority ?? p.priority,
        hasOnMessage: !!loadedPlugin?.onMessage,
        hasCronJobs: !!(loadedPlugin?.cronJobs && loadedPlugin.cronJobs.length > 0),
        commands: loadedPlugin?.commands?.map(cmd => ({
          name: cmd.name,
          description: cmd.description,
          usage: cmd.usage,
          permission: cmd.permission
        }))
      };
    });
    
    // 添加已加载但未注册的插件（来自文件系统扫描）
    for (const loadedPlugin of loaded) {
      if (!registeredMap.has(loadedPlugin.id)) {
        mergedPlugins.push({
          id: loadedPlugin.id,
          name: loadedPlugin.name,
          enabled: loadedPlugin.enabled,
          version: loadedPlugin.version,
          description: loadedPlugin.description,
          author: loadedPlugin.author,
          priority: loadedPlugin.priority,
          loaded: true,
          hasOnMessage: !!loadedPlugin.onMessage,
          hasCronJobs: !!(loadedPlugin.cronJobs && loadedPlugin.cronJobs.length > 0),
          commands: loadedPlugin.commands?.map(cmd => ({
            name: cmd.name,
            description: cmd.description,
            usage: cmd.usage,
            permission: cmd.permission
          })),
          updatedAt: new Date().toISOString()
        });
      }
    }
    
    res.json({ items: mergedPlugins });
  });

  // 获取已加载的插件实例
  app.get('/plugins/loaded', (_req, res) => {
    const loaded = getLoadedPlugins();
    res.json({
      items: loaded.map(p => ({
        id: p.id,
        name: p.name,
        version: p.version,
        description: p.description,
        enabled: p.enabled,
        priority: p.priority,
        commandCount: p.commands?.length || 0
      }))
    });
  });

  // 获取可用命令列表
  app.get('/plugins/commands', (_req, res) => {
    const commands = getAvailableCommands();
    res.json({
      items: commands.map(c => ({
        plugin: c.plugin,
        name: c.command.name,
        aliases: c.command.aliases,
        description: c.command.description,
        usage: c.command.usage
      }))
    });
  });

  // 获取插件配置
  app.get('/plugins/config', (_req, res) => {
    res.json(getPluginConfig());
  });

  // 更新插件配置
  app.put('/plugins/config', (req, res) => {
    updatePluginConfig(req.body);
    res.json({ ok: true });
  });

  app.post('/plugins', async (req, res) => {
    const { name, description, version } = req.body as {
      name?: string;
      description?: string;
      version?: string;
    };

    if (!name) {
      res.status(400).json({ error: 'name 为必填项' });
      return;
    }

    const exists = plugins.find((p) => p.name === name);
    if (exists) {
      res.status(409).json({ error: '插件名称已存在' });
      return;
    }

    const item: PluginInfo = {
      id: id('plg'),
      name,
      enabled: true,
      version: version || '1.0.0',
      description: description || '自定义插件',
      updatedAt: nowIso()
    };

    plugins.unshift(item);
    await savePluginsToDisk();
    addSystemLog('INFO', 'plugin', `已创建插件：${item.name}`);
    res.status(201).json(item);
  });

  app.post('/plugins/:id/toggle', async (req, res) => {
    const item = plugins.find((p) => p.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: '插件不存在' });
      return;
    }

    item.enabled = !item.enabled;
    item.updatedAt = nowIso();
    await savePluginsToDisk();

    // 如果禁用，卸载插件；如果启用，尝试重新加载
    if (!item.enabled) {
      await unloadPlugin(item.id);
    } else {
      await reloadPlugin(item.id);
    }

    addSystemLog('INFO', 'plugin', `插件${item.enabled ? '启用' : '停用'}：${item.name}`);
    res.json(item);
  });

  // 热重载插件
  app.post('/plugins/:id/reload', async (req, res) => {
    const item = plugins.find((p) => p.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: '插件不存在' });
      return;
    }

    try {
      const reloaded = await reloadPlugin(item.id);
      if (reloaded) {
        res.json({ ok: true, plugin: { id: reloaded.id, name: reloaded.name, version: reloaded.version } });
      } else {
        res.status(400).json({ error: '插件文件未找到' });
      }
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete('/plugins/:id', async (req, res) => {
    const index = plugins.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: '插件不存在' });
      return;
    }

    const [deleted] = plugins.splice(index, 1);
    await savePluginsToDisk();
    addSystemLog('INFO', 'plugin', `已删除插件：${deleted.name}`);
    res.json({ ok: true, deleted });
  });
  // 插件健康监控 API
  app.get('/plugins/health', (_req, res) => {
    const loaded = getLoadedPlugins();
    const PLUGINS_DIR = getPluginsDir();
    
    type PluginHealthEntry = {
      id: string;
      name: string;
      version: string;
      status: 'healthy' | 'error' | 'disabled';
      enabled: boolean;
      commandCount: number;
      messageCount: number;
      errorCount: number;
      lastActiveAt: string | null;
      loadedAt: string;
      uptime: number;
    };
    
    const healthData: PluginHealthEntry[] = loaded.map(plugin => {
      const stats = pluginHealthStats.get(plugin.id) || {
        messageCount: 0,
        errorCount: 0,
        lastActiveAt: null as string | null,
        loadedAt: new Date().toISOString(),
      };
      
      return {
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        status: 'healthy' as const,
        enabled: plugin.enabled ?? true,
        commandCount: plugin.commands?.length || 0,
        messageCount: stats.messageCount,
        errorCount: stats.errorCount,
        lastActiveAt: stats.lastActiveAt,
        loadedAt: stats.loadedAt,
        uptime: Date.now() - new Date(stats.loadedAt).getTime(),
      };
    });
    
    // 加上已注册但未加载的插件（error状态）
    for (const p of plugins) {
      if (!loaded.find(l => l.id === p.id) && p.enabled) {
        healthData.push({
          id: p.id,
          name: p.name,
          version: p.version || '?',
          status: 'error',
          enabled: p.enabled,
          commandCount: 0,
          messageCount: 0,
          errorCount: 1,
          lastActiveAt: null,
          loadedAt: new Date().toISOString(),
          uptime: 0,
        });
      }
    }
    
    res.json({
      total: plugins.length,
      loaded: loaded.length,
      errored: plugins.filter(p => p.enabled && !loaded.find(l => l.id === p.id)).length,
      disabled: plugins.filter(p => !p.enabled).length,
      plugins: healthData,
    });
  });
  
  // 重置插件健康统计
  app.delete('/plugins/:id/health', (req, res) => {
    pluginHealthStats.delete(req.params.id);
    res.json({ ok: true });
  });
}

// 插件健康统计（内存中）
export const pluginHealthStats = new Map<string, {
  messageCount: number;
  errorCount: number;
  lastActiveAt: string | null;
  loadedAt: string;
}>();
