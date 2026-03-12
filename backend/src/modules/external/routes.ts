import { Express, Request, Response, NextFunction } from 'express';
import { openApiTokens, accounts, platformStatus, conversations, messages, appConfig, platformLogs } from '../../core/store.js';
import { trySendToQQ, connectGateway, disconnectGateway } from '../platform/gateway.js';
import { BotAccount } from '../../types.js';

/**
 * OpenAPI 认证中间件
 */
function openApiAuth(req: Request, res: Response, next: NextFunction): void {
  // 检查是否启用 OpenAPI
  if (!appConfig.allowOpenApi) {
    res.status(403).json({ error: 'OpenAPI 已禁用', code: 'OPENAPI_DISABLED' });
    return;
  }

  // 获取 Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '缺少认证令牌', code: 'MISSING_TOKEN' });
    return;
  }

  const token = authHeader.slice(7);
  const tokenInfo = openApiTokens.find(t => t.token === token && t.enabled);
  
  if (!tokenInfo) {
    res.status(401).json({ error: '无效或已禁用的令牌', code: 'INVALID_TOKEN' });
    return;
  }

  // 将 token 信息附加到请求对象
  (req as any).openApiToken = tokenInfo;
  next();
}

/**
 * 获取当前连接的账号
 */
function getConnectedAccount(): BotAccount | null {
  const accountId = platformStatus.connectedAccountId;
  if (!accountId) return null;
  return accounts.find(a => a.id === accountId) || null;
}

/**
 * 注册外部 API 路由
 */
export function registerExternalApiRoutes(app: Express): void {
  // 所有外部 API 路由都需要认证
  const apiRouter = '/api/external';

  // 获取机器人状态
  app.get(`${apiRouter}/status`, openApiAuth, (_req, res) => {
    const account = getConnectedAccount();
    
    res.json({
      connected: platformStatus.connected,
      accountId: account ? account.id : null,
      accountName: account ? account.name : null,
      appId: account ? account.appId : null,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // 连接机器人
  app.post(`${apiRouter}/connect`, openApiAuth, async (req, res) => {
    const { accountId } = req.body as { accountId?: string };
    
    if (!accountId) {
      res.status(400).json({ error: 'accountId 为必填项', code: 'MISSING_ACCOUNT_ID' });
      return;
    }

    const account = accounts.find(a => a.id === accountId);
    if (!account) {
      res.status(404).json({ error: '账号不存在', code: 'ACCOUNT_NOT_FOUND' });
      return;
    }

    try {
      await connectGateway(accountId);
      res.json({ ok: true, message: '正在连接...' });
    } catch (error) {
      res.status(500).json({ error: String(error), code: 'CONNECT_FAILED' });
    }
  });

  // 断开连接
  app.post(`${apiRouter}/disconnect`, openApiAuth, (_req, res) => {
    disconnectGateway(false);
    res.json({ ok: true, message: '已断开连接' });
  });

  // 发送消息
  app.post(`${apiRouter}/send`, openApiAuth, async (req, res) => {
    const { targetId, targetType, message, msgId } = req.body as {
      targetId?: string;
      targetType?: 'user' | 'group';
      message?: string;
      msgId?: string;
    };

    if (!targetId || !targetType || !message) {
      res.status(400).json({ 
        error: 'targetId, targetType, message 为必填项', 
        code: 'MISSING_PARAMS' 
      });
      return;
    }

    const account = getConnectedAccount();
    if (!account) {
      res.status(503).json({ error: '机器人未连接', code: 'NOT_CONNECTED' });
      return;
    }

    try {
      await trySendToQQ(account, targetId, message, msgId, targetType);
      res.json({ 
        ok: true, 
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: String(error), code: 'SEND_FAILED' });
    }
  });

  // 获取会话列表
  app.get(`${apiRouter}/conversations`, openApiAuth, (req, res) => {
    const limitParam = req.query.limit as string | undefined;
    const offsetParam = req.query.offset as string | undefined;
    const limitNum = limitParam ? parseInt(limitParam, 10) : 50;
    const offsetNum = offsetParam ? parseInt(offsetParam, 10) : 0;

    const list = conversations
      .slice(offsetNum, offsetNum + limitNum)
      .map(c => ({
        id: c.id,
        peerId: c.peerId,
        peerName: c.peerName,
        peerType: c.peerType,
        unreadCount: c.unreadCount,
        updatedAt: c.updatedAt,
        tags: c.tags
      }));

    res.json({
      total: conversations.length,
      items: list
    });
  });

  // 获取会话消息
  app.get(`${apiRouter}/conversations/:id/messages`, openApiAuth, (req, res) => {
    const limitParam = req.query.limit as string | undefined;
    const before = req.query.before as string | undefined;
    const limitNum = limitParam ? parseInt(limitParam, 10) : 50;
    
    const convId = req.params.id;
    const conv = conversations.find(c => c.id === convId);
    
    if (!conv) {
      res.status(404).json({ error: '会话不存在', code: 'CONVERSATION_NOT_FOUND' });
      return;
    }

    let convMessages = messages.filter(m => m.conversationId === convId);
    
    if (before) {
      const beforeTime = new Date(before).getTime();
      convMessages = convMessages.filter(m => new Date(m.createdAt).getTime() < beforeTime);
    }

    const list = convMessages
      .slice(-limitNum)
      .map(m => ({
        id: m.id,
        conversationId: m.conversationId,
        direction: m.direction,
        text: m.text,
        createdAt: m.createdAt,
        status: m.status
      }));

    res.json({
      conversationId: convId,
      total: convMessages.length,
      items: list
    });
  });

  // 获取账号列表
  app.get(`${apiRouter}/accounts`, openApiAuth, (_req, res) => {
    const list = accounts.map(a => ({
      id: a.id,
      name: a.name,
      appId: a.appId,
      status: a.status
    }));

    res.json({ items: list });
  });

  // 获取平台日志
  app.get(`${apiRouter}/logs`, openApiAuth, (req, res) => {
    const limitParam = req.query.limit as string | undefined;
    const limitNum = limitParam ? parseInt(limitParam, 10) : 100;

    const list = platformLogs
      .slice(-limitNum)
      .map(l => ({
        id: l.id,
        level: l.level,
        message: l.message,
        createdAt: l.createdAt
      }));

    res.json({ items: list });
  });

  // 获取统计信息
  app.get(`${apiRouter}/statistics`, openApiAuth, (_req, res) => {
    import('../../core/store.js').then(({ buildStatisticsSnapshot }) => {
      const snapshot = buildStatisticsSnapshot();
      res.json(snapshot);
    });
  });
}
