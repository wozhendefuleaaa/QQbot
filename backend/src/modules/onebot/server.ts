import type { Server as HttpServer } from 'http';
import crypto from 'crypto';
import { WebSocketServer } from 'ws';
import { accounts, addPlatformLog, nowIso } from '../../core/store.js';
import { verifyOneBotBearerToken } from './auth.js';
import { handleOneBotIncomingMessage } from './adapter.js';
import { addOneBotConnection, getOneBotConnection, removeOneBotConnection, setLastOneBotEventAt } from './state.js';
import type { OneBotActionRequest, OneBotActionResponse, OneBotWsEnvelope } from './types.js';

let onebotWss: WebSocketServer | null = null;

function normalizeRemoteAddress(value: string | undefined) {
  return value || null;
}

function sendOneBotFrame(socket: { send: (data: string) => void }, payload: unknown) {
  socket.send(JSON.stringify(payload));
}

export async function callOneBotAction(
  accountId: string,
  action: string,
  params: Record<string, unknown> = {},
  timeoutMs = 15000
): Promise<OneBotActionResponse> {
  const connection = getOneBotConnection(accountId);
  if (!connection) {
    return { status: 'failed', retcode: 1404, data: null, echo: null, msg: 'OneBot 账号未连接' };
  }

  const echo = `obe_${crypto.randomBytes(8).toString('hex')}`;
  const request: OneBotActionRequest = {
    action,
    params,
    echo,
  };

  return await new Promise<OneBotActionResponse>((resolve) => {
    const timer = setTimeout(() => {
      connection.pendingActions.delete(echo);
      resolve({ status: 'failed', retcode: 1408, data: null, echo, msg: 'OneBot action 响应超时' });
    }, timeoutMs);

    connection.pendingActions.set(echo, { resolve, timer });
    sendOneBotFrame(connection.socket, request);
  });
}

export function initOneBotServer(server: HttpServer) {
  if (onebotWss) return onebotWss;

  onebotWss = new WebSocketServer({
    server,
    path: '/onebot/v11/ws',
    maxPayload: 1024 * 1024,
  });

  onebotWss.on('connection', (socket, req) => {
    const authResult = verifyOneBotBearerToken(req.headers.authorization);
    if (!authResult.ok) {
      addPlatformLog('WARN', `OneBot 连接鉴权失败: ${authResult.error}`);
      socket.close(1008, authResult.error);
      return;
    }

    const account = accounts.find((item) => item.id === authResult.accountId);
    if (!account) {
      socket.close(1008, '绑定账号不存在');
      return;
    }

    const connectionId = `obc_${crypto.randomBytes(6).toString('hex')}`;
    const connection = {
      connectionId,
      accountId: account.id,
      accountName: account.name,
      selfId: account.onebotSelfId || null,
      tokenId: authResult.token.id,
      remoteAddress: normalizeRemoteAddress(req.socket.remoteAddress),
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
      connectedAt: nowIso(),
      lastSeenAt: nowIso(),
      lastHeartbeatAt: null as string | null,
      socket,
      pendingActions: new Map(),
    };

    addOneBotConnection(connection);
    addPlatformLog('INFO', `OneBot 连接建立: account=${account.name}, connectionId=${connectionId}`);

    socket.on('message', (payload) => {
      connection.lastSeenAt = nowIso();
      setLastOneBotEventAt(connection.lastSeenAt);

      try {
        const text = payload.toString();
        const data = JSON.parse(text) as OneBotWsEnvelope;
        if (data.meta_event_type === 'heartbeat') {
          connection.lastHeartbeatAt = nowIso();
        }
        if (typeof data.echo === 'string') {
          const pending = connection.pendingActions.get(data.echo);
          if (pending) {
            connection.pendingActions.delete(data.echo);
            clearTimeout(pending.timer);
            pending.resolve({
              status: data.status || 'ok',
              retcode: typeof data.retcode === 'number' ? data.retcode : 0,
              data: data.data ?? null,
              echo: data.echo,
              msg: typeof data.msg === 'string' ? data.msg : undefined,
              wording: typeof data.wording === 'string' ? data.wording : undefined,
            });
            return;
          }
        }
        if (data.post_type === 'message') {
          void handleOneBotIncomingMessage(account.id, data);
        }
      } catch {
        addPlatformLog('WARN', `OneBot 收到无法解析的 JSON: connectionId=${connectionId}`);
      }
    });

    socket.on('close', () => {
      for (const [echo, pending] of connection.pendingActions.entries()) {
        clearTimeout(pending.timer);
        pending.resolve({ status: 'failed', retcode: 1407, data: null, echo, msg: 'OneBot 连接已断开' });
      }
      connection.pendingActions.clear();
      removeOneBotConnection(connectionId);
      addPlatformLog('INFO', `OneBot 连接断开: account=${account.name}, connectionId=${connectionId}`);
    });

    socket.on('error', (error) => {
      addPlatformLog('ERROR', `OneBot 连接异常: connectionId=${connectionId}, error=${error.message}`);
    });

    socket.send(JSON.stringify({
      status: 'ok',
      retcode: 1,
      data: {
        message: 'connected',
        connectionId,
      },
    }));
  });

  addPlatformLog('INFO', 'OneBot 反向 WS 服务已初始化: path=/onebot/v11/ws');
  return onebotWss;
}

export function getOneBotServer() {
  return onebotWss;
}
