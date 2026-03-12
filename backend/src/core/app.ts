import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fileUpload from 'express-fileupload';
import { Redis } from 'ioredis';
import mysql from 'mysql2/promise';
import {
  addPlatformLog,
  addSystemLog,
  flushSaveChatDataToDisk,
  loadAccountsFromDisk,
  loadAppConfigFromDisk,
  loadChatDataFromDisk,
  loadOpenApiTokensFromDisk,
  loadPluginsFromDisk,
  loadQuickRepliesFromDisk,
  nowIso,
  accounts
} from './store.js';
import { loadAllPlugins } from './plugin-manager.js';
import { registerAccountRoutes } from '../modules/accounts/routes.js';
import { registerChatRoutes } from '../modules/chat/routes.js';
import { registerConfigRoutes } from '../modules/config/routes.js';
import { registerLogRoutes } from '../modules/logs/routes.js';
import { registerOpenApiRoutes } from '../modules/openapi/routes.js';
import { registerPlatformRoutes } from '../modules/platform/routes.js';
import { registerPluginRoutes } from '../modules/plugins/routes.js';
import { registerQuickReplyRoutes } from '../modules/quickreply/routes.js';
import { registerStatisticsRoutes } from '../modules/statistics/routes.js';
import { registerGroupRoutes } from '../modules/group/routes.js';
import { registerExternalApiRoutes } from '../modules/external/routes.js';
import { registerSseRoutes } from '../modules/sse/routes.js';

dotenv.config({ path: '../.env' });

const app = express();
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json());
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 限制
  createParentPath: true
}));
app.use((req, _res, next) => {
  console.log(`[api] ${req.method} ${req.path}`);
  next();
});

const port = Number(process.env.BACKEND_PORT || 3000);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'qqbot-backend',
    timestamp: nowIso()
  });
});

app.get('/ready', async (_req, res) => {
  const mysqlUrl = process.env.MYSQL_URL;
  const redisUrl = process.env.REDIS_URL;

  const checks: Record<string, string> = {
    mysql: 'skipped',
    redis: 'skipped'
  };

  try {
    if (mysqlUrl) {
      const conn = await mysql.createConnection(mysqlUrl);
      await conn.ping();
      await conn.end();
      checks.mysql = 'ok';
    }

    if (redisUrl) {
      const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
      await redis.connect();
      await redis.ping();
      await redis.quit();
      checks.redis = 'ok';
    }

    res.json({ status: 'ready', checks });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      checks,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

registerAccountRoutes(app);
registerPlatformRoutes(app);
registerChatRoutes(app);
registerConfigRoutes(app);
registerPluginRoutes(app);
registerLogRoutes(app);
registerStatisticsRoutes(app);
registerOpenApiRoutes(app);
registerQuickReplyRoutes(app);
registerGroupRoutes(app);
registerExternalApiRoutes(app);
registerSseRoutes(app);

async function bootstrap() {
  await loadAccountsFromDisk();
  await loadAppConfigFromDisk();
  await loadPluginsFromDisk();
  await loadOpenApiTokensFromDisk();
  await loadChatDataFromDisk();
  await loadQuickRepliesFromDisk();

  // 加载插件
  try {
    await loadAllPlugins();
  } catch (error) {
    addSystemLog('ERROR', 'plugin', `加载插件失败: ${error}`);
  }

  app.listen(port, () => {
    addPlatformLog('INFO', `backend listening on :${port}`);
    
    // 自动连接第一个有效账号
    autoConnectFirstAccount();
  });
}

/**
 * 自动连接第一个有效账号
 */
async function autoConnectFirstAccount() {
  // 等待一小段时间确保服务完全启动
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 查找第一个有 appId 和 appSecret 的账号
  const validAccount = accounts.find(a => a.appId && a.appSecret);
  if (validAccount) {
    addSystemLog('INFO', 'framework', `检测到有效账号 "${validAccount.name}"，正在自动连接...`);
    try {
      const { connectGateway } = await import('../modules/platform/gateway.js');
      await connectGateway(validAccount.id);
    } catch (error) {
      addSystemLog('ERROR', 'framework', `自动连接失败: ${error}`);
    }
  }
}

async function setupProcessExitHooks() {
  const flushAndExit = async (signal: string) => {
    addSystemLog('INFO', 'framework', `收到进程信号 ${signal}，正在落盘聊天数据`);
    await flushSaveChatDataToDisk();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void flushAndExit('SIGINT');
  });

  process.on('SIGTERM', () => {
    void flushAndExit('SIGTERM');
  });

  process.on('beforeExit', () => {
    void flushSaveChatDataToDisk();
  });
}

void setupProcessExitHooks();

bootstrap().catch((error) => {
  console.error('bootstrap failed', error);
  process.exit(1);
});
