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

export function registerPluginRoutes(app: Express) {
  // 获取插件注册表
  app.get('/api/plugins', (_req, res) => {
    res.json({ items: plugins });
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
