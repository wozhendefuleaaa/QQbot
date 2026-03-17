import { Express } from 'express';
import { platformLogs, platformStatus, accounts, conversations, addPlatformLog } from '../../core/store.js';
import { connectGateway, disconnectGateway } from './gateway.js';
import { qqAuthPrefix, qqGatewayApiBase, fetchAppAccessToken } from '../../core/store.js';
import { authMiddleware } from '../../core/middleware/auth.js';

/**
 * 获取机器人加入的群组列表
 * QQ 官方 API: GET /v2/users/@me/groups
 */
async function getBotGroups(account: { appId: string; appSecret: string }): Promise<{ success: boolean; groups?: Array<{ id: string; name: string }>; error?: string }> {
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const url = `${baseApi}/v2/users/@me/groups`;

  try {
    const token = await fetchAppAccessToken(account as any);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `${qqAuthPrefix} ${token}`,
        'X-Union-Appid': account.appId,
      },
    });

    if (res.ok) {
      const data = await res.json() as { data?: Array<{ group_openid?: string; group_name?: string }> };
      const groups = (data.data || []).map(g => ({
        id: g.group_openid || '',
        name: g.group_name || g.group_openid || ''
      })).filter(g => g.id);
      addPlatformLog('INFO', `获取群组列表成功: count=${groups.length}`);
      return { success: true, groups };
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `获取群组列表失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    return { success: false, error: `HTTP ${res.status}` };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `获取群组列表异常: ${errMsg}`);
    return { success: false, error: errMsg };
  }
}

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

  // 获取指定账号的群组列表（需要认证）
  app.get('/api/platform/groups/:accountId', authMiddleware, async (req, res) => {
    const { accountId } = req.params;
    const account = accounts.find(a => a.id === accountId);
    
    if (!account) {
      res.status(404).json({ error: '账号不存在' });
      return;
    }

    const result = await getBotGroups(account);
    if (result.success) {
      res.json({ groups: result.groups });
    } else {
      res.status(500).json({ error: result.error || '获取群组列表失败' });
    }
  });

  // 获取所有账号的群组和私聊列表（用于配置中心）
  app.get('/api/platform/contacts', authMiddleware, async (req, res) => {
    const allGroups: Array<{ accountId: string; accountName: string; groups: Array<{ id: string; name: string }> }> = [];
    const privateChats: Array<{ accountId: string; accountName: string; peers: Array<{ id: string; name: string }> }> = [];

    // 从会话中提取私聊
    const privateConvMap = new Map<string, Set<string>>();
    conversations.forEach(conv => {
      if (conv.peerType === 'user') {
        if (!privateConvMap.has(conv.accountId)) {
          privateConvMap.set(conv.accountId, new Set());
        }
        privateConvMap.get(conv.accountId)!.add(conv.peerId);
      }
    });

    // 为每个在线账号获取群组列表
    for (const account of accounts) {
      const accountInfo = {
        accountId: account.id,
        accountName: account.name,
        groups: [] as Array<{ id: string; name: string }>
      };

      // 如果账号在线，尝试获取群组列表
      if (platformStatus.connected && platformStatus.connectedAccountId === account.id) {
        const result = await getBotGroups(account);
        if (result.success && result.groups) {
          accountInfo.groups = result.groups;
        }
      }

      // 从会话中补充群组信息
      conversations.forEach(conv => {
        if (conv.peerType === 'group' && conv.accountId === account.id) {
          const exists = accountInfo.groups.some(g => g.id === conv.peerId);
          if (!exists) {
            accountInfo.groups.push({
              id: conv.peerId,
              name: conv.peerName || conv.peerId
            });
          }
        }
      });

      allGroups.push(accountInfo);

      // 添加私聊信息
      const peers = Array.from(privateConvMap.get(account.id) || []).map(id => {
        const conv = conversations.find(c => c.peerId === id && c.accountId === account.id);
        return { id, name: conv?.peerName || id };
      });
      
      privateChats.push({
        accountId: account.id,
        accountName: account.name,
        peers
      });
    }

    res.json({ groups: allGroups, privateChats });
  });
}
