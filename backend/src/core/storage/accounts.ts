import { BotAccount, AccountStatus } from '../../types.js';
import { getDatabase } from './sqlite.js';
import { addPlatformLog } from '../logs.js';
import { cache } from '../cache/redis.js';

export const accounts: BotAccount[] = [];

export async function loadAccountsFromDisk() {
  try {
    const db = getDatabase();
    const parsed = db.prepare('SELECT * FROM accounts').all();
    if (Array.isArray(parsed)) {
      const validAccounts = parsed
        .filter((x: any) => x?.id && x?.appId && x?.appSecret)
        .map((x: any) => ({
          id: x.id,
          name: x.name,
          appId: x.appId,
          appSecret: x.appSecret || x.appKey || '',
          appSecretMasked: x.appSecretMasked || '******',
          status: (x.status as AccountStatus) || 'OFFLINE',
          createdAt: x.createdAt || new Date().toISOString(),
          updatedAt: x.updatedAt || new Date().toISOString()
        }));
      accounts.splice(0, accounts.length, ...validAccounts);
      addPlatformLog('INFO', `已加载账号存储：${accounts.length} 个`);
    }
  } catch (error) {
    const e = error as Error;
    addPlatformLog('WARN', `加载账号存储失败：${e.message}`);
  }
}

export async function saveAccountsToDisk() {
  // 由于使用SQLite，此函数不再需要，保留以保持兼容性
}

export async function getAccounts() {
  // 尝试从缓存获取
  const cachedAccounts = await cache.get<BotAccount[]>(`${cache.prefix.accounts}all`);
  if (cachedAccounts) {
    return cachedAccounts;
  }

  // 从数据库获取
  const db = getDatabase();
  const accounts = db.prepare('SELECT * FROM accounts').all();
  
  // 缓存结果
  await cache.set(`${cache.prefix.accounts}all`, accounts, 3600);
  
  return accounts;
}

export async function getAccount(id: string) {
  // 尝试从缓存获取
  const cachedAccount = await cache.get<BotAccount>(`${cache.prefix.accounts}${id}`);
  if (cachedAccount) {
    return cachedAccount;
  }

  // 从数据库获取
  const db = getDatabase();
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) || null;
  
  // 缓存结果
  if (account) {
    await cache.set(`${cache.prefix.accounts}${id}`, account, 3600);
  }
  
  return account;
}

export async function addAccount(account: BotAccount) {
  const db = getDatabase();
  const insert = db.prepare(`
    INSERT INTO accounts (id, name, appId, appSecret, token, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const now = Date.now();
  insert.run(
    account.id,
    account.name,
    account.appId,
    account.appSecret,
    null, // token
    account.status || 'OFFLINE',
    now,
    now
  );
  
  // 清除缓存
  await cache.del(`${cache.prefix.accounts}all`);
  await cache.set(`${cache.prefix.accounts}${account.id}`, account, 3600);
  
  // 更新内存中的accounts数组
  accounts.push(account);
  return account;
}

export async function updateAccount(id: string, updates: Partial<BotAccount>) {
  const db = getDatabase();
  const account = await getAccount(id);
  if (!account) return null;
  
  const updateFields = Object.keys(updates).filter(key => key !== 'id');
  if (updateFields.length === 0) return account;
  
  const setClause = updateFields.map(key => `${key} = ?`).join(', ');
  const values = updateFields.map(key => (updates as any)[key]);
  values.push(Date.now(), id);
  
  const update = db.prepare(`
    UPDATE accounts SET ${setClause}, updatedAt = ? WHERE id = ?
  `);
  update.run(...values);
  
  // 清除缓存
  await cache.del(`${cache.prefix.accounts}all`);
  await cache.del(`${cache.prefix.accounts}${id}`);
  
  // 更新内存中的accounts数组
  const index = accounts.findIndex(a => a.id === id);
  if (index !== -1) {
    accounts[index] = { ...accounts[index], ...updates };
  }
  
  return await getAccount(id);
}

export async function deleteAccount(id: string) {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
  
  // 清除缓存
  await cache.del(`${cache.prefix.accounts}all`);
  await cache.del(`${cache.prefix.accounts}${id}`);
  
  // 更新内存中的accounts数组
  const index = accounts.findIndex(a => a.id === id);
  if (index !== -1) {
    accounts.splice(index, 1);
  }
  
  return result.changes > 0;
}
