import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fileUpload from 'express-fileupload';
import path from 'path';
import { fileURLToPath } from 'url';
import { Redis } from 'ioredis';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
import { registerOneBotRoutes } from '../modules/onebot/routes.js';
import { registerQuickReplyRoutes } from '../modules/quickreply/routes.js';
import { registerStatisticsRoutes } from '../modules/statistics/routes.js';
import { registerGroupRoutes } from '../modules/group/routes.js';
import { registerExternalApiRoutes } from '../modules/external/routes.js';
import { registerSseRoutes } from '../modules/sse/routes.js';
import { registerAuthRoutes } from '../modules/auth/routes.js';
import { registerMarketRoutes } from '../modules/market/routes.js';
import { initializeDefaultAdmin } from './auth.js';
import { createApiRateLimiter, errorHandler, notFoundHandler, authMiddleware } from './middleware/index.js';

dotenv.config({ path: '../.env' });

const app = express();

// 安全中间件：速率限制
app.use(createApiRateLimiter());

// CORS 配置 - 根据环境动态配置
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175']);

app.use(
  cors({
    origin: process.env.NODE_ENV === 'production'
      ? corsOrigins
      : '*', // 开发环境允许所有来源
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Response-Time', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
    maxAge: 86400 // 预检请求缓存 24 小时
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 限制
  createParentPath: true
}));

// 请求日志中间件 - 记录响应时间
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // 响应完成后记录日志（不设置 header，因为响应已完成）
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // 只记录非健康检查的请求
    if (req.path !== '/health' && req.path !== '/ready') {
      const logLevel = res.statusCode >= 400 ? 'WARN' : 'INFO';
      console.log(`[${logLevel}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
  });
  
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

// 认证路由（无需认证）
registerAuthRoutes(app);

// External API 路由（使用独立的 OpenAPI Token 认证，必须在 JWT 认证中间件之前注册）
registerExternalApiRoutes(app);

// SSE 路由（无需 JWT 认证，使用独立的认证机制）
registerSseRoutes(app);

// 插件市场路由（公开接口，不需要认证）
registerMarketRoutes(app);

// 以下路由需要 JWT 认证保护
app.use('/api', authMiddleware);

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
registerOneBotRoutes(app);

// 生产环境：托管前端静态文件
if (process.env.NODE_ENV === 'production') {
  const webuiDist = process.env.WEBUI_DIST || path.resolve(process.cwd(), 'webui/dist');
  app.use(express.static(webuiDist));
  // SPA 回退：所有非 API 请求返回 index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(webuiDist, 'index.html'));
  });
}

// 404 处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

async function bootstrap() {
  await loadAccountsFromDisk();
  await loadAppConfigFromDisk();
  await loadPluginsFromDisk();
  await loadOpenApiTokensFromDisk();
  await loadChatDataFromDisk();
  await loadQuickRepliesFromDisk();

  // 初始化默认管理员账户
  await initializeDefaultAdmin();

  // 加载插件
  try {
    await loadAllPlugins();
  } catch (error) {
    addSystemLog('ERROR', 'plugin', `加载插件失败: ${error}`);
  }

  const server = app.listen(port, async () => {
    addPlatformLog('INFO', `backend listening on :${port}`);

    const { initOneBotServer } = await import('../modules/onebot/server.js');
    initOneBotServer(server);
    
    // 自动连接第一个 QQ 官方账号
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
