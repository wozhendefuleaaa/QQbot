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
import { authMiddleware } from '../../core/middleware/auth.js';

export function registerAccountRoutes(app: Express) {
  // 获取账号列表 - 需要认证
  app.get('/api/accounts', authMiddleware, (_req, res) => {
    res.json({ items: accounts.map(toPublicAccount) });
  });

  // 创建账号 - 需要认证
  app.post('/api/accounts', authMiddleware, async (req, res) => {
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
      platformType: 'qq_official',
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

  // 启动账号 - 需要认证
  app.post('/api/accounts/:id/start', authMiddleware, async (req, res) => {
    const item = accounts.find((a) => a.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: '账号不存在' });
      return;
    }

    item.status = 'ONLINE';
    item.updatedAt = nowIso();
    await saveAccountsToDisk();

    if (item.platformType === 'onebot_v11') {
      res.json(toPublicAccount(item));
      return;
    }
 
    // 自动触发平台连接
    try {
      await connectGateway(item.id);
      res.json(toPublicAccount(item));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ ...toPublicAccount(item), connectError: message });
    }
  });

  // 停止账号 - 需要认证
  app.post('/api/accounts/:id/stop', authMiddleware, async (req, res) => {
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

  // 删除账号 - 需要认证
  app.delete('/api/accounts/:id', authMiddleware, async (req, res) => {
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
