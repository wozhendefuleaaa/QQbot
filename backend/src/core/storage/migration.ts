import path from 'path';
import { dataDir, readJsonFile } from './base.js';
import { getDatabase } from './sqlite.js';

// 数据迁移函数
export async function migrateData() {
  const db = getDatabase();
  
  // 迁移账号数据
  await migrateAccounts(db);
  
  // 迁移应用配置
  await migrateAppConfig(db);
  
  // 迁移插件数据
  await migratePlugins(db);
  
  // 迁移云崽权限数据
  await migrateYunzaiPermissions(db);
  
  // 迁移OpenAPI令牌数据
  await migrateOpenApiTokens(db);
  
  // 迁移快捷回复数据
  await migrateQuickReplies(db);
  
  console.log('数据迁移完成');
}

// 迁移账号数据
async function migrateAccounts(db: any) {
  const accountsPath = path.join(dataDir, 'accounts.json');
  const accounts = await readJsonFile<any[]>(accountsPath);
  
  if (accounts) {
    const insertAccount = db.prepare(`
      INSERT OR REPLACE INTO accounts (id, name, appId, appKey, token, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const account of accounts) {
      insertAccount.run(
        account.id,
        account.name,
        account.appId,
        account.appKey,
        account.token || null,
        account.status || 'offline',
        Date.now(),
        Date.now()
      );
    }
  }
}

// 迁移应用配置
async function migrateAppConfig(db: any) {
  const configPath = path.join(dataDir, 'config.json');
  const config = await readJsonFile<any>(configPath);
  
  if (config) {
    const insertConfig = db.prepare(`
      INSERT OR REPLACE INTO app_config (key, value)
      VALUES (?, ?)
    `);
    
    for (const [key, value] of Object.entries(config)) {
      insertConfig.run(key, JSON.stringify(value));
    }
  }
}

// 迁移插件数据
async function migratePlugins(db: any) {
  const pluginsPath = path.join(dataDir, 'plugins.json');
  const plugins = await readJsonFile<any[]>(pluginsPath);
  
  if (plugins) {
    const insertPlugin = db.prepare(`
      INSERT OR REPLACE INTO plugins (id, name, version, description, enabled, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    for (const plugin of plugins) {
      insertPlugin.run(
        plugin.id,
        plugin.name,
        plugin.version || '1.0.0',
        plugin.description || '',
        plugin.enabled ? 1 : 0,
        Date.now()
      );
    }
  }
}

// 迁移云崽权限数据
async function migrateYunzaiPermissions(db: any) {
  const yunzaiPath = path.join(dataDir, 'yunzai-permission.json');
  const yunzaiData = await readJsonFile<any>(yunzaiPath);
  
  if (yunzaiData) {
    const insertPermission = db.prepare(`
      INSERT OR REPLACE INTO yunzai_permissions (type, userId)
      VALUES (?, ?)
    `);
    
    // 迁移主人权限
    if (yunzaiData.masterIds) {
      for (const userId of yunzaiData.masterIds) {
        insertPermission.run('master', userId);
      }
    }
    
    // 迁移管理员权限
    if (yunzaiData.adminIds) {
      for (const userId of yunzaiData.adminIds) {
        insertPermission.run('admin', userId);
      }
    }
  }
}

// 迁移OpenAPI令牌数据
async function migrateOpenApiTokens(db: any) {
  const tokensPath = path.join(dataDir, 'openapi-tokens.json');
  const tokens = await readJsonFile<any[]>(tokensPath);
  
  if (tokens) {
    const insertToken = db.prepare(`
      INSERT OR REPLACE INTO openapi_tokens (id, token, description, createdAt, expiresAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const token of tokens) {
      insertToken.run(
        token.id,
        token.token,
        token.description || '',
        token.createdAt || Date.now(),
        token.expiresAt || null
      );
    }
  }
}

// 迁移快捷回复数据
async function migrateQuickReplies(db: any) {
  const repliesPath = path.join(dataDir, 'quick-replies.json');
  const replies = await readJsonFile<any[]>(repliesPath);
  
  if (replies) {
    const insertReply = db.prepare(`
      INSERT OR REPLACE INTO quick_replies (id, keyword, reply, enabled, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const reply of replies) {
      insertReply.run(
        reply.id,
        reply.keyword,
        reply.reply,
        reply.enabled ? 1 : 0,
        Date.now()
      );
    }
  }
}
