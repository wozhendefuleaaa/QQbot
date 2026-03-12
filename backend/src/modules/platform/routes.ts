import { Express } from 'express';
import { platformLogs, platformStatus } from '../../core/store.js';
import { connectGateway, disconnectGateway } from './gateway.js';

export function registerPlatformRoutes(app: Express) {
  app.get('/api/platform/status', (_req, res) => {
    res.json(platformStatus);
  });

  app.get('/api/platform/logs', (req, res) => {
    const limit = Number(req.query.limit || 100);
    res.json({ items: platformLogs.slice(0, Math.max(1, Math.min(limit, 300))) });
  });

  app.post('/api/platform/connect', async (req, res) => {
    const forceRefreshToken = Boolean(req.body?.forceRefreshToken);
    const accountId = String(req.body?.accountId || '').trim();

    if (!accountId) {
      res.status(400).json({ ok: false, error: 'accountId 为必填项', status: platformStatus });
      return;
    }

    try {
      await connectGateway(accountId, forceRefreshToken);
      res.json({ ok: true, status: platformStatus });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const statusCode = message.includes('获取 Gateway 地址失败') ? 502 : 500;
      const hint =
        statusCode === 502
          ? 'Gateway 查询失败，请确认网关基址（生产: https://api.sgroup.qq.com / 沙箱: https://sandbox.api.sgroup.qq.com），并在 .env 配置 QQ_GATEWAY_API_BASE 后重启 backend。'
          : undefined;

      res.status(statusCode).json({
        ok: false,
        error: message,
        hint,
        status: platformStatus
      });
    }
  });

  app.post('/api/platform/disconnect', (req, res) => {
    const autoReconnect = Boolean(req.body?.autoReconnect);
    disconnectGateway(autoReconnect);
    res.json({ ok: true, status: platformStatus });
  });
}
