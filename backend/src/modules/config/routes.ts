import { Express } from 'express';
import { appConfig, saveAppConfigToDisk, addSystemLog } from '../../core/store.js';
import { PluginPermissionMatrix, LogLevel } from '../../types.js';
import { authMiddleware } from '../../core/middleware/auth.js';
import { validateBody, validateParams } from '../../core/middleware/validator.js';
import { createRateLimiter } from '../../core/middleware/rate-limit.js';

// 验证规则
const configUpdateSchema = {
  webName: { type: 'string' as const, maxLength: 100 },
  notice: { type: 'string' as const, maxLength: 1000 },
  allowOpenApi: { type: 'boolean' as const },
  defaultIntent: { type: 'number' as const, min: 0 },
};

const accountIdSchema = {
  accountId: { required: true, type: 'string' as const, minLength: 1, maxLength: 100 },
};

const addGroupSchema = {
  groupId: { required: true, type: 'string' as const, minLength: 1, maxLength: 200 },
};

const togglePluginSchema = {
  groupId: { required: true, type: 'string' as const, minLength: 1, maxLength: 200 },
  pluginId: { required: true, type: 'string' as const, minLength: 1, maxLength: 100 },
  disabled: { required: true, type: 'boolean' as const },
};

const permissionMatrixSchema = {
  groups: { type: 'array' as const },
  disabledPlugins: { type: 'object' as const },
};

// 速率限制器实例
const configRateLimiter = createRateLimiter({ windowMs: 60000, max: 10 });
const permissionRateLimiter = createRateLimiter({ windowMs: 60000, max: 30 });
const toggleRateLimiter = createRateLimiter({ windowMs: 60000, max: 100 });

// 验证 pluginPermissions 数据结构
function validatePluginPermissions(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  
  const permissions = data as Record<string, unknown>;
  for (const [accountId, matrix] of Object.entries(permissions)) {
    if (typeof accountId !== 'string' || accountId.length === 0) return false;
    if (typeof matrix !== 'object' || matrix === null) return false;
    
    const m = matrix as Record<string, unknown>;
    if (!Array.isArray(m.groups)) return false;
    if (typeof m.disabledPlugins !== 'object' || m.disabledPlugins === null) return false;
  }
  return true;
}

// 记录系统日志的辅助函数
function logConfigChange(level: LogLevel, message: string) {
  addSystemLog(level, 'config', message);
}

export function registerConfigRoutes(app: Express) {
  // 所有配置路由都需要认证
  app.use('/api/config', authMiddleware);

  // 获取配置
  app.get('/api/config', (_req, res) => {
    res.json(appConfig);
  });

  // 更新配置 - 带速率限制
  app.post('/api/config', 
    configRateLimiter,
    validateBody(configUpdateSchema),
    async (req, res) => {
      const { webName, notice, allowOpenApi, defaultIntent, pluginPermissions } = req.body as {
        webName?: string;
        notice?: string;
        allowOpenApi?: boolean;
        defaultIntent?: number;
        pluginPermissions?: Record<string, PluginPermissionMatrix>;
      };

      const changes: string[] = [];

      if (typeof webName === 'string' && webName !== appConfig.webName) {
        appConfig.webName = webName;
        changes.push('webName');
      }
      if (typeof notice === 'string' && notice !== appConfig.notice) {
        appConfig.notice = notice;
        changes.push('notice');
      }
      if (typeof allowOpenApi === 'boolean' && allowOpenApi !== appConfig.allowOpenApi) {
        appConfig.allowOpenApi = allowOpenApi;
        changes.push('allowOpenApi');
      }
      if (typeof defaultIntent === 'number' && Number.isFinite(defaultIntent) && defaultIntent >= 0 && defaultIntent !== appConfig.defaultIntent) {
        appConfig.defaultIntent = defaultIntent;
        changes.push('defaultIntent');
      }
      if (pluginPermissions && typeof pluginPermissions === 'object') {
        // 验证数据结构
        if (!validatePluginPermissions(pluginPermissions)) {
          res.status(400).json({ error: 'pluginPermissions 数据结构无效' });
          return;
        }
        appConfig.pluginPermissions = pluginPermissions;
        changes.push('pluginPermissions');
      }

      if (changes.length > 0) {
        await saveAppConfigToDisk();
        logConfigChange('INFO', `配置已更新: ${changes.join(', ')}`);
      }

      res.json({ ok: true, config: appConfig });
    }
  );

  // 获取指定账号的插件权限矩阵
  app.get('/api/config/plugin-permissions/:accountId', 
    validateParams(accountIdSchema),
    (req, res) => {
      const { accountId } = req.params;
      const perm = appConfig.pluginPermissions[accountId];
      if (!perm) {
        // 返回空的矩阵结构
        res.json({ 
          accountId,
          groups: [],
          disabledPlugins: {}
        });
      } else {
        res.json(perm);
      }
    }
  );

  // 保存指定账号的插件权限矩阵
  app.post('/api/config/plugin-permissions/:accountId',
    permissionRateLimiter,
    validateParams(accountIdSchema),
    validateBody(permissionMatrixSchema),
    async (req, res) => {
      const { accountId } = req.params;
      const { groups, disabledPlugins } = req.body as {
        groups?: string[];
        disabledPlugins?: Record<string, string[]>;
      };

      if (!groups || !disabledPlugins) {
        res.status(400).json({ error: 'groups 和 disabledPlugins 为必填项' });
        return;
      }

      // 验证 groups
      if (!Array.isArray(groups) || !groups.every(g => typeof g === 'string')) {
        res.status(400).json({ error: 'groups 必须是字符串数组' });
        return;
      }

      // 验证 disabledPlugins
      if (typeof disabledPlugins !== 'object') {
        res.status(400).json({ error: 'disabledPlugins 必须是对象' });
        return;
      }

      appConfig.pluginPermissions[accountId] = {
        accountId,
        groups,
        disabledPlugins
      };

      await saveAppConfigToDisk();
      logConfigChange('INFO', `账号 ${accountId} 的插件权限矩阵已更新`);
      res.json({ ok: true, data: appConfig.pluginPermissions[accountId] });
    }
  );

  // 更新单个单元格（某个群组中禁用/启用某个插件）
  app.patch('/api/config/plugin-permissions/:accountId/toggle',
    toggleRateLimiter,
    validateParams(accountIdSchema),
    validateBody(togglePluginSchema),
    async (req, res) => {
      const { accountId } = req.params;
      const { groupId, pluginId, disabled } = req.body as {
        groupId: string;
        pluginId: string;
        disabled: boolean;
      };

      // 确保账号的权限矩阵存在
      if (!appConfig.pluginPermissions[accountId]) {
        appConfig.pluginPermissions[accountId] = {
          accountId,
          groups: [],
          disabledPlugins: {}
        };
      }

      const perm = appConfig.pluginPermissions[accountId];
      
      // 确保群组在列表中
      if (!perm.groups.includes(groupId)) {
        perm.groups.push(groupId);
      }
      
      // 确保该群组的禁用列表存在
      if (!perm.disabledPlugins[groupId]) {
        perm.disabledPlugins[groupId] = [];
      }

      const disabledList = perm.disabledPlugins[groupId];
      const pluginIndex = disabledList.indexOf(pluginId);

      if (disabled && pluginIndex === -1) {
        // 禁用插件
        disabledList.push(pluginId);
      } else if (!disabled && pluginIndex !== -1) {
        // 启用插件（从禁用列表移除）
        disabledList.splice(pluginIndex, 1);
      }

      await saveAppConfigToDisk();
      logConfigChange('INFO', `账号 ${accountId} 群组 ${groupId} 插件 ${pluginId} 已${disabled ? '禁用' : '启用'}`);
      res.json({ ok: true, data: perm });
    }
  );

  // 添加群组到账号的群组列表
  app.post('/api/config/plugin-permissions/:accountId/groups',
    permissionRateLimiter,
    validateParams(accountIdSchema),
    validateBody(addGroupSchema),
    async (req, res) => {
      const { accountId } = req.params;
      const { groupId } = req.body as { groupId: string };

      if (!appConfig.pluginPermissions[accountId]) {
        appConfig.pluginPermissions[accountId] = {
          accountId,
          groups: [],
          disabledPlugins: {}
        };
      }

      const perm = appConfig.pluginPermissions[accountId];
      if (!perm.groups.includes(groupId)) {
        perm.groups.push(groupId);
        perm.disabledPlugins[groupId] = [];
        await saveAppConfigToDisk();
        logConfigChange('INFO', `账号 ${accountId} 添加群组 ${groupId}`);
      }

      res.json({ ok: true, data: perm });
    }
  );

  // 从账号的群组列表移除群组
  app.delete('/api/config/plugin-permissions/:accountId/groups/:groupId',
    permissionRateLimiter,
    validateParams({ ...accountIdSchema, groupId: { required: true, type: 'string', minLength: 1, maxLength: 200 } }),
    async (req, res) => {
      const { accountId, groupId } = req.params;

      const perm = appConfig.pluginPermissions[accountId];
      if (!perm) {
        res.json({ ok: true });
        return;
      }

      const groupIndex = perm.groups.indexOf(groupId);
      if (groupIndex !== -1) {
        perm.groups.splice(groupIndex, 1);
        delete perm.disabledPlugins[groupId];
        await saveAppConfigToDisk();
        logConfigChange('INFO', `账号 ${accountId} 移除群组 ${groupId}`);
      }

      res.json({ ok: true, data: perm });
    }
  );
}
