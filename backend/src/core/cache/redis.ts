import { Redis } from 'ioredis';
import { addSystemLog } from '../logs.js';

let redisClient: Redis | null = null;

// 初始化Redis连接
export async function initRedis() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    addSystemLog('INFO', 'framework', 'Redis URL 未配置，缓存功能将被禁用');
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    await redisClient.ping();
    addSystemLog('INFO', 'framework', 'Redis 连接成功');
    return redisClient;
  } catch (error) {
    addSystemLog('ERROR', 'framework', `Redis 连接失败: ${error}`);
    return null;
  }
}

// 获取Redis客户端
export function getRedisClient() {
  return redisClient;
}

// 关闭Redis连接
export async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
      addSystemLog('INFO', 'framework', 'Redis 连接已关闭');
    } catch (error) {
      addSystemLog('ERROR', 'framework', `关闭Redis连接失败: ${error}`);
    }
    redisClient = null;
  }
}

// 缓存操作封装
export const cache = {
  // 设置缓存
  async set(key: string, value: any, expiration: number = 3600): Promise<boolean> {
    if (!redisClient) return false;
    
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await redisClient.set(key, stringValue, 'EX', expiration);
      return true;
    } catch (error) {
      addSystemLog('ERROR', 'framework', `设置缓存失败: ${error}`);
      return false;
    }
  },

  // 获取缓存
  async get<T>(key: string): Promise<T | null> {
    if (!redisClient) return null;
    
    try {
      const value = await redisClient.get(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error) {
      addSystemLog('ERROR', 'framework', `获取缓存失败: ${error}`);
      return null;
    }
  },

  // 删除缓存
  async del(key: string): Promise<boolean> {
    if (!redisClient) return false;
    
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      addSystemLog('ERROR', 'framework', `删除缓存失败: ${error}`);
      return false;
    }
  },

  // 清除匹配模式的缓存
  async clearPattern(pattern: string): Promise<boolean> {
    if (!redisClient) return false;
    
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
      return true;
    } catch (error) {
      addSystemLog('ERROR', 'framework', `清除缓存失败: ${error}`);
      return false;
    }
  },

  // 缓存键前缀
  prefix: {
    accounts: 'accounts:',
    plugins: 'plugins:',
    config: 'config:',
    permissions: 'permissions:',
    tokens: 'tokens:',
  }
};
