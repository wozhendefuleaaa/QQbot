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
  updatePluginConfig
} from '../../core/plugin-manager.js';
import fs from 'fs';
import path from 'path';

// 插件文件目录
const PLUGINS_DIR = path.join(process.cwd(), 'src', 'plugins');

export function registerPluginRoutes(app: Express) {
  // 获取插件源码
  app.get('/api/plugins/:id/source', async (req, res) => {
    try {
      const pluginFile = path.join(PLUGINS_DIR, `${req.params.id}.ts`);
      const jsPluginFile = path.join(PLUGINS_DIR, `${req.params.id}.js`);
      
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
  app.post('/api/plugins/upload', async (req, res) => {
    try {
      const { filename, content } = req.body as { filename?: string; content?: string };
      
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
        // 检查是否已存在于 plugins 数组中
        const existingIndex = plugins.findIndex(p => p.id === loadedPlugin.id);
        if (existingIndex < 0) {
          // 添加到 plugins 数组
          const newPluginInfo: PluginInfo = {
            id: loadedPlugin.id,
            name: loadedPlugin.name,
            version: loadedPlugin.version || '1.0.0',
            description: loadedPlugin.description || '',
            author: loadedPlugin.author || 'Unknown',
            enabled: true,
            priority: loadedPlugin.priority || 50,
            updatedAt: nowIso()
          };
          plugins.push(newPluginInfo);
          savePluginsToDisk();
        }
        addSystemLog('INFO', 'plugin', `已上传并加载插件：${loadedPlugin.name} (${safeName})`);
        res.status(201).json({ id: loadedPlugin.id, filename: safeName, loaded: true });
      } else {
        addSystemLog('WARN', 'plugin', `已上传插件文件但加载失败：${safeName}`);
        res.status(201).json({ id: pluginId, filename: safeName, loaded: false });
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // 保存/更新插件源码
  app.put('/api/plugins/:id/source', async (req, res) => {
    try {
      const { content } = req.body as { content?: string };
      
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
  app.get('/api/plugins', (_req, res) => {
    const loaded = getLoadedPlugins();
    const loadedMap = new Map(loaded.map(p => [p.id, p]));
    
    const mergedPlugins = plugins.map(p => {
      const loadedPlugin = loadedMap.get(p.id);
      return {
        ...p,
        loaded: !!loadedPlugin,
        author: loadedPlugin?.author,
        priority: loadedPlugin?.priority,
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
    
    res.json({ items: mergedPlugins });
  });

  // 获取已加载的插件实例
  app.get('/api/plugins/loaded', (_req, res) => {
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
  app.get('/api/plugins/commands', (_req, res) => {
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
  app.get('/api/plugins/config', (_req, res) => {
    res.json(getPluginConfig());
  });

  // 更新插件配置
  app.put('/api/plugins/config', (req, res) => {
    updatePluginConfig(req.body);
    res.json({ ok: true });
  });

  app.post('/api/plugins', async (req, res) => {
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

  app.post('/api/plugins/:id/toggle', async (req, res) => {
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
  app.post('/api/plugins/:id/reload', async (req, res) => {
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

  app.delete('/api/plugins/:id', async (req, res) => {
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
}
