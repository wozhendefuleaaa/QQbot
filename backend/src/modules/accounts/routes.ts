import { Express } from 'express';
import { BotAccount } from '../../types.js';
import {
  accounts,
  id,
  maskSecret,
  nowIso,
  platformStatus,
  saveAccountsToDisk,
  toPublicAccount
} from '../../core/store.js';
import { connectGateway, disconnectGateway } from '../platform/gateway.js';

export function registerAccountRoutes(app: Express) {
  app.get('/api/accounts', (_req, res) => {
    res.json({ items: accounts.map(toPublicAccount) });
  });

  app.post('/api/accounts', async (req, res) => {
    const { name, appId, appSecret } = req.body as {
      name?: string;
      appId?: string;
      appSecret?: string;
    };

    if (!name || !appId || !appSecret) {
      res.status(400).json({ error: 'name/appId/appSecret 为必填项' });
      return;
    }

    const item: BotAccount = {
      id: id('acc'),
      name,
      appId,
      appSecret,
      appSecretMasked: maskSecret(appSecret),
      status: 'DISABLED',
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    accounts.unshift(item);
    await saveAccountsToDisk();
    res.status(201).json(toPublicAccount(item));
  });

  app.post('/api/accounts/:id/start', async (req, res) => {
    const item = accounts.find((a) => a.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: '账号不存在' });
      return;
    }

    item.status = 'ONLINE';
    item.updatedAt = nowIso();
    await saveAccountsToDisk();

    // 自动触发平台连接
    try {
      await connectGateway(item.id);
      res.json(toPublicAccount(item));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ ...toPublicAccount(item), connectError: message });
    }
  });

  app.post('/api/accounts/:id/stop', async (req, res) => {
    const item = accounts.find((a) => a.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: '账号不存在' });
      return;
    }

    // 如果当前连接的是此账号，断开连接
    if (platformStatus.connectedAccountId === item.id) {
      disconnectGateway(false); // 主动停止不自动重连
    }

    item.status = 'DISABLED';
    item.updatedAt = nowIso();
    await saveAccountsToDisk();
    res.json(toPublicAccount(item));
  });

  app.delete('/api/accounts/:id', async (req, res) => {
    const index = accounts.findIndex((a) => a.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: '账号不存在' });
      return;
    }

    // 如果当前连接的是此账号，断开连接
    if (platformStatus.connectedAccountId === accounts[index].id) {
      disconnectGateway(false);
    }

    const [removed] = accounts.splice(index, 1);
    await saveAccountsToDisk();
    res.json(toPublicAccount(removed));
  });
}
