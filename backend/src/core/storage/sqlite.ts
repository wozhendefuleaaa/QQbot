import Database from 'better-sqlite3';
import path from 'path';
import { dataDir, ensureDataDir } from './base.js';

const dbPath = path.join(dataDir, 'qqbot.db');

// 数据库实例
let db: Database.Database | null = null;

// 初始化数据库
export async function initDatabase() {
  await ensureDataDir();
  
  // 创建数据库连接
  db = new Database(dbPath);
  
  // 启用外键约束
  db.exec('PRAGMA foreign_keys = ON;');
  
  // 创建表结构
  createTables();
  
  return db;
}

// 获取数据库实例
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

// 创建表结构
function createTables() {
  if (!db) return;
  
  // 账号表
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      appId TEXT NOT NULL,
      appKey TEXT NOT NULL,
      token TEXT,
      status TEXT DEFAULT 'offline',
      createdAt INTEGER DEFAULT CURRENT_TIMESTAMP,
      updatedAt INTEGER DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // 聊天记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      accountId TEXT NOT NULL,
      groupId TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (accountId) REFERENCES accounts(id)
    );
  `);
  
  // 插件表
  db.exec(`
    CREATE TABLE IF NOT EXISTS plugins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      description TEXT,
      enabled INTEGER DEFAULT 1,
      createdAt INTEGER DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // 插件权限表
  db.exec(`
    CREATE TABLE IF NOT EXISTS plugin_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      accountId TEXT NOT NULL,
      groupId TEXT NOT NULL,
      pluginId TEXT NOT NULL,
      disabled INTEGER DEFAULT 0,
      FOREIGN KEY (accountId) REFERENCES accounts(id),
      FOREIGN KEY (pluginId) REFERENCES plugins(id),
      UNIQUE(accountId, groupId, pluginId)
    );
  `);
  
  // 应用配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  
  // 云崽权限表
  db.exec(`
    CREATE TABLE IF NOT EXISTS yunzai_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      userId TEXT NOT NULL,
      UNIQUE(type, userId)
    );
  `);
  
  // OpenAPI令牌表
  db.exec(`
    CREATE TABLE IF NOT EXISTS openapi_tokens (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      description TEXT,
      createdAt INTEGER DEFAULT CURRENT_TIMESTAMP,
      expiresAt INTEGER
    );
  `);
  
  // 快捷回复表
  db.exec(`
    CREATE TABLE IF NOT EXISTS quick_replies (
      id TEXT PRIMARY KEY,
      keyword TEXT NOT NULL,
      reply TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      createdAt INTEGER DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// 关闭数据库连接
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
