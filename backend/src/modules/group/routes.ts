import { Express } from 'express';
import { accounts, platformStatus, setPlatformError } from '../../core/store.js';
import {
  getGroupMembers,
  muteGroupMember,
  unmuteGroupMember,
  kickGroupMember
} from '../platform/gateway.js';

export function registerGroupRoutes(app: Express) {
  // 获取群成员列表
  app.get('/api/groups/:groupId/members', async (req, res) => {
    const { groupId } = req.params;
    const { accountId } = req.query as { accountId?: string };

    if (!accountId) {
      res.status(400).json({ error: 'accountId 为必填项' });
      return;
    }

    const account = accounts.find((a) => a.id === accountId);
    if (!account) {
      res.status(404).json({ error: '账号不存在' });
      return;
    }

    // 检查平台连接状态
    if (!platformStatus.connected || platformStatus.connectedAccountId !== accountId) {
      res.status(400).json({ error: '平台未连接' });
      return;
    }

    try {
      const result = await getGroupMembers(account, groupId);
      if (result.success) {
        res.json({ success: true, members: result.members });
      } else {
        res.status(500).json({ error: '获取群成员列表失败' });
      }
    } catch (error) {
      setPlatformError(error);
      res.status(502).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // 禁言群成员
  app.post('/api/groups/:groupId/members/:userId/mute', async (req, res) => {
    const { groupId, userId } = req.params;
    const { accountId, duration } = req.body as { accountId?: string; duration?: number };

    if (!accountId) {
      res.status(400).json({ error: 'accountId 为必填项' });
      return;
    }

    if (!duration || duration < 0) {
      res.status(400).json({ error: '禁言时长必须大于 0' });
      return;
    }

    // 最大禁言时长 30 天
    const maxDuration = 30 * 24 * 60 * 60;
    if (duration > maxDuration) {
      res.status(400).json({ error: '禁言时长不能超过 30 天' });
      return;
    }

    const account = accounts.find((a) => a.id === accountId);
    if (!account) {
      res.status(404).json({ error: '账号不存在' });
      return;
    }

    // 检查平台连接状态
    if (!platformStatus.connected || platformStatus.connectedAccountId !== accountId) {
      res.status(400).json({ error: '平台未连接' });
      return;
    }

    try {
      const result = await muteGroupMember(account, groupId, userId, duration);
      if (result.success) {
        res.json({ success: true, message: '禁言成功' });
      } else {
        res.status(500).json({ error: '禁言失败' });
      }
    } catch (error) {
      setPlatformError(error);
      res.status(502).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // 解除禁言
  app.delete('/api/groups/:groupId/members/:userId/mute', async (req, res) => {
    const { groupId, userId } = req.params;
    const { accountId } = req.body as { accountId?: string };

    if (!accountId) {
      res.status(400).json({ error: 'accountId 为必填项' });
      return;
    }

    const account = accounts.find((a) => a.id === accountId);
    if (!account) {
      res.status(404).json({ error: '账号不存在' });
      return;
    }

    // 检查平台连接状态
    if (!platformStatus.connected || platformStatus.connectedAccountId !== accountId) {
      res.status(400).json({ error: '平台未连接' });
      return;
    }

    try {
      const result = await unmuteGroupMember(account, groupId, userId);
      if (result.success) {
        res.json({ success: true, message: '解除禁言成功' });
      } else {
        res.status(500).json({ error: '解除禁言失败' });
      }
    } catch (error) {
      setPlatformError(error);
      res.status(502).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // 踢出群成员
  app.delete('/api/groups/:groupId/members/:userId', async (req, res) => {
    const { groupId, userId } = req.params;
    const { accountId } = req.query as { accountId?: string };

    if (!accountId) {
      res.status(400).json({ error: 'accountId 为必填项' });
      return;
    }

    const account = accounts.find((a) => a.id === accountId);
    if (!account) {
      res.status(404).json({ error: '账号不存在' });
      return;
    }

    // 检查平台连接状态
    if (!platformStatus.connected || platformStatus.connectedAccountId !== accountId) {
      res.status(400).json({ error: '平台未连接' });
      return;
    }

    try {
      const result = await kickGroupMember(account, groupId, userId);
      if (result.success) {
        res.json({ success: true, message: '踢出成功' });
      } else {
        res.status(500).json({ error: '踢出失败' });
      }
    } catch (error) {
      setPlatformError(error);
      res.status(502).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
}
