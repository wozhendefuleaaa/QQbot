import { Express } from 'express';
import { accounts, addPlatformLog, nowIso, saveAccountsToDisk } from '../../core/store.js';
import { authMiddleware } from '../../core/middleware/auth.js';
import { createOneBotToken } from './auth.js';
import { listOneBotConnections, buildOneBotStatusOverview } from './state.js';

export function registerOneBotRoutes(app: Express) {
  app.get('/api/onebot/status', authMiddleware, (_req, res) => {
    res.json(buildOneBotStatusOverview());
  });

  app.get('/api/onebot/connections', authMiddleware, (_req, res) => {
    res.json({ items: listOneBotConnections() });
  });

  app.post('/api/onebot/accounts', authMiddleware, async (req, res) => {
    const { name, selfId } = req.body as { name?: string; selfId?: string };

    if (!name || !selfId) {
      res.status(400).json({ error: 'name/selfId 为必填项' });
      return;
    }

    const item = {
      id: `acc_${Math.random().toString(36).slice(2, 10)}`,
      name,
      appId: '',
      appSecret: '',
      appSecretMasked: '',
      platformType: 'onebot_v11' as const,
      onebotSelfId: selfId,
      status: 'DISABLED' as const,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    accounts.unshift(item);
    await saveAccountsToDisk();
    addPlatformLog('INFO', `创建 OneBot 账号: ${name} (${selfId})`);
    res.status(201).json(item);
  });

  app.post('/api/onebot/tokens', authMiddleware, async (req, res) => {
    const { accountId, name } = req.body as { accountId?: string; name?: string };
    if (!accountId || !name) {
      res.status(400).json({ error: 'accountId/name 为必填项' });
      return;
    }

    const account = accounts.find((item) => item.id === accountId && item.platformType === 'onebot_v11');
    if (!account) {
      res.status(404).json({ error: 'OneBot 账号不存在' });
      return;
    }

    const result = createOneBotToken(accountId, name);
    res.status(201).json({
      item: {
        id: result.record.id,
        name: result.record.name,
        accountId: result.record.accountId,
        enabled: result.record.enabled,
        lastUsedAt: result.record.lastUsedAt,
        createdAt: result.record.createdAt,
        updatedAt: result.record.updatedAt,
      },
      token: result.token,
    });
  });
}
