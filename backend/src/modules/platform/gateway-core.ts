import { BotAccount, Message } from '../../types.js';
import WebSocket from 'ws';
import {
  accounts,
  addPlatformLog,
  ensureConversationForInbound,
  fetchAppAccessToken,
  gatewayIntents,
  platformStatus,
  qqAuthPrefix,
  qqGatewayApiBase,
  qqGatewayUrlFromEnv,
  setPlatformError
} from '../../core/store.js';
import { broadcastNewMessage, broadcastPlatformStatus } from '../sse/routes.js';
import { OP_RECONNECT, OP_INVALID_SESSION, OP_HELLO, OP_HEARTBEAT_ACK, DEFAULT_INTENTS, GatewayPayload, GatewayHelloData } from './gateway-utils.js';
import { parseInboundEvent, safePayloadSnippet, firstNonEmptyString } from './gateway-utils.js';
import { trySendToQQ, recordMsgIdTimestamp } from './gateway-message.js';

// 导出消息相关函数
export {
  trySendToQQ,
  recallMessage,
  uploadImage,
  sendImageMessage,
  recordMsgIdTimestamp,
  sendMarkdownMessage,
  sendArkMessage,
  sendEmbedMessage,
  sendKeyboardMessage,
  sendMixedMessage,
  QQ_MSG_TYPE
} from './gateway-message.js';

// 导出消息类型
export type {
  QQMarkdownPayload,
  QQArkPayload,
  QQEmbedPayload,
  QQKeyboardPayload,
  QQMessagePayload
} from './gateway-message.js';

// Gateway 运行时状态
let gatewaySocket: WebSocket | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let lastSeq: number | null = null;
let gatewayIdentifyPayload: Record<string, unknown> | null = null;
let heartbeatIntervalMs = 0;
let lastHeartbeatAckAt = 0;
let reconnectAttempts = 0;
let reconnectForceRefreshToken = false;
let suppressReconnectCloseCount = 0;

/**
 * 获取 Gateway URL
 */
async function fetchGatewayUrl(appId: string, token: string): Promise<string> {
  if (qqGatewayUrlFromEnv) {
    return qqGatewayUrlFromEnv;
  }

  const baseCandidates = [qqGatewayApiBase, 'https://api.sgroup.qq.com', 'https://sandbox.api.sgroup.qq.com']
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);

  const errors: string[] = [];

  for (const base of baseCandidates) {
    const url = `${base.replace(/\/$/, '')}/gateway/bot`;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      addPlatformLog('INFO', `按官方文档获取 Gateway 地址: ${url}（尝试 ${attempt + 1}/3）`);
      try {
        const res = await fetch(url, {
          headers: {
            Authorization: `${qqAuthPrefix} ${token}`,
            'X-Union-Appid': appId
          }
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          errors.push(`${url} -> HTTP ${res.status}${detail ? ` ${detail.slice(0, 200)}` : ''}`);
        } else {
          const data = (await res.json()) as { url?: string };
          if (data.url) {
            return data.url;
          }
          errors.push(`${url} -> 响应缺少 url 字段`);
        }
      } catch (error) {
        errors.push(`${url} -> ${error instanceof Error ? error.message : String(error)}`);
      }

      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 3000 + attempt * 1000));
      }
    }
  }

  throw new Error(`获取 Gateway 地址失败: ${errors.join(' ; ')}`);
}

/**
 * 清理 Gateway 运行时状态
 */
function clearGatewayRuntime(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  heartbeatIntervalMs = 0;
  lastHeartbeatAckAt = 0;
  lastSeq = null;
}

/**
 * 安排重连
 */
function scheduleReconnect(forceRefreshToken = false, reason?: string): void {
  reconnectForceRefreshToken = reconnectForceRefreshToken || forceRefreshToken;
  if (reconnectTimer) return;

  reconnectAttempts += 1;
  const delay = Math.min(30_000, 5_000 * reconnectAttempts);
  addPlatformLog('WARN', `${delay / 1000} 秒后自动重连 Gateway${reason ? `（${reason}）` : ''}`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    const reconnectAccountId = platformStatus.connectedAccountId;
    const useForceRefreshToken = reconnectForceRefreshToken;
    reconnectForceRefreshToken = false;

    if (!reconnectAccountId) {
      addPlatformLog('WARN', '未找到可重连账号，已跳过自动重连');
      return;
    }
    connectGateway(reconnectAccountId, useForceRefreshToken).catch(setPlatformError);
  }, delay);
}

/**
 * 处理 Gateway 消息
 */
async function handleGatewayMessage(raw: WebSocket.RawData): Promise<void> {
  try {
    const payload = JSON.parse(String(raw)) as GatewayPayload;

    if (typeof payload.s === 'number') {
      lastSeq = payload.s;
    }

    if (payload.op === OP_HELLO) {
      const helloData = payload.d as GatewayHelloData | undefined;
      if (!helloData?.heartbeat_interval) return;
      const interval = Number(helloData.heartbeat_interval);
      heartbeatIntervalMs = Number.isFinite(interval) && interval > 0 ? interval : 30_000;
      lastHeartbeatAckAt = Date.now();

      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        if (!gatewaySocket || gatewaySocket.readyState !== WebSocket.OPEN) {
          return;
        }

        const now = Date.now();
        const staleThreshold = heartbeatIntervalMs * 2 + 15_000;
        if (lastHeartbeatAckAt > 0 && now - lastHeartbeatAckAt > staleThreshold) {
          addPlatformLog('WARN', `心跳 ACK 超时（>${staleThreshold}ms），主动重连 Gateway`);
          gatewaySocket.terminate();
          return;
        }

        gatewaySocket.send(JSON.stringify({ op: 1, d: lastSeq }));
      }, heartbeatIntervalMs);
      addPlatformLog('INFO', `收到 HELLO，心跳间隔 ${heartbeatIntervalMs}ms`);

      if (gatewaySocket?.readyState === WebSocket.OPEN && gatewayIdentifyPayload) {
        gatewaySocket.send(JSON.stringify({ op: 2, d: gatewayIdentifyPayload }));
        addPlatformLog('INFO', `已发送 IDENTIFY`);
      }
      return;
    }

    if (payload.op === OP_HEARTBEAT_ACK) {
      lastHeartbeatAckAt = Date.now();
      addPlatformLog('INFO', '收到心跳 ACK');
      return;
    }

    if (payload.op === OP_RECONNECT) {
      addPlatformLog('WARN', '网关要求重连（OP 7）');
      scheduleReconnect(false, '网关下发 OP 7');
      gatewaySocket?.close();
      return;
    }

    if (payload.op === OP_INVALID_SESSION) {
      addPlatformLog('WARN', '会话无效（OP 9），准备重连并刷新 AccessToken');
      scheduleReconnect(true, '会话无效 OP 9');
      gatewaySocket?.close();
      return;
    }

    if (payload.t) {
      const parsed = parseInboundEvent(payload);
      if (parsed?.shouldRecord) {
        // 记录 msg_id 时间戳，用于后续回复时判断是否过期
        if (parsed.inboundMsgId) {
          recordMsgIdTimestamp(parsed.inboundMsgId);
        }

        const saved = ensureConversationForInbound(parsed.peerId, parsed.content, parsed.peerType, {
          peerName: parsed.peerName,
          inboundMsgId: parsed.inboundMsgId
        });

        addPlatformLog(
          'INFO',
          `收到事件 ${payload.t}${parsed.inboundMsgId ? ` msg_id=${parsed.inboundMsgId}` : ''} peer=${parsed.peerId}${parsed.peerOpenId ? ` openid=${parsed.peerOpenId}` : ''} content=${parsed.content.slice(0, 80)}${saved ? ` conv=${saved.conversationId}` : ''}`
        );

        // 分发消息给插件系统处理
        if (saved) {
          const { dispatchMessage } = await import('../../core/plugin-manager.js');
          // 直接构造消息对象，避免依赖 messages 数组
          const inboundMsg: Message = {
            id: saved.messageId,
            accountId: saved.accountId,
            conversationId: saved.conversationId,
            direction: 'in',
            text: parsed.content,
            createdAt: new Date().toISOString()
          };
          // 使用 peerOpenId（QQ API 要求 openid），如果没有则回退到 peerId
          const targetId = parsed.peerOpenId || parsed.peerId;
          // 传入 inboundMsgId 用于被动回复
          const inboundMsgId = parsed.inboundMsgId || undefined;
          addPlatformLog('INFO', `分发消息到插件系统: text="${parsed.content.slice(0, 50)}" targetId=${targetId} peerType=${parsed.peerType} msgId=${inboundMsgId || 'none'}`);
          // 传递额外的发送信息：targetId (openid)、peerType 和 inboundMsgId
          await dispatchMessage(inboundMsg, targetId, parsed.peerType, inboundMsgId);
          
          // 通过 SSE 广播新消息到前端
          broadcastNewMessage(saved.conversationId, inboundMsg);
        }
      } else {
        const d = payload.d as Record<string, unknown> | undefined;
        const eventId = firstNonEmptyString(d?.id as string, payload.id);
        const isInboundLike = payload.t.includes('MESSAGE') || payload.t === 'INTERACTION_CREATE';
        if (isInboundLike) {
          const rawSnippet = safePayloadSnippet(payload.d);
          addPlatformLog(
            'WARN',
            `收到事件 ${payload.t}${eventId ? ` id=${eventId}` : ''} 但未命中解析规则，raw=${rawSnippet}`
          );
        } else {
          addPlatformLog('INFO', `收到事件 ${payload.t}${eventId ? ` id=${eventId}` : ''}`);
        }
      }
    }
  } catch (error) {
    addPlatformLog('WARN', `解析 Gateway 消息失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 连接 Gateway
 */
export async function connectGateway(accountId: string, forceRefreshToken = false): Promise<void> {
  if (platformStatus.connecting) {
    addPlatformLog('WARN', '平台正在连接中，跳过重复连接');
    return;
  }

  if (platformStatus.connected && platformStatus.connectedAccountId === accountId) {
    addPlatformLog('WARN', '平台已连接到当前账号，跳过重复连接');
    return;
  }

  if (platformStatus.connected && platformStatus.connectedAccountId !== accountId) {
    disconnectGateway();
  }

  const account = accounts.find((a) => a.id === accountId);
  if (!account) {
    throw new Error('账号不存在');
  }

  if (!account.appId || !account.appSecret) {
    throw new Error('该账号未配置 AppID 或 AppSecret');
  }

  platformStatus.connecting = true;
  platformStatus.lastError = null;
  platformStatus.connectedAccountId = account.id;
  platformStatus.connectedAccountName = account.name;

  try {
    const token = await fetchAppAccessToken(account, forceRefreshToken);
    const gatewayUrl = await fetchGatewayUrl(account.appId, token);

    const resolvedIntents = gatewayIntents === 0 ? DEFAULT_INTENTS : gatewayIntents;
    if (gatewayIntents === 0) {
      addPlatformLog('WARN', `QQ_GATEWAY_INTENTS 为 0，已自动回退到默认 intents=${resolvedIntents}`);
    }

    gatewayIdentifyPayload = {
      token: `${qqAuthPrefix} ${token}`,
      intents: resolvedIntents,
      shard: [0, 1],
      properties: {
        $os: 'linux',
        $browser: 'elaina-bot',
        $device: 'elaina-bot'
      }
    };

    addPlatformLog('INFO', `连接 Gateway: ${gatewayUrl}`);

    if (gatewaySocket && gatewaySocket.readyState !== WebSocket.CLOSED) {
      try {
        suppressReconnectCloseCount += 1;
        gatewaySocket.close();
      } catch {
        // no-op
      }
    }

    const socket = new WebSocket(gatewayUrl, {
      headers: {
        Authorization: `${qqAuthPrefix} ${token}`,
        'X-Union-Appid': account.appId
      }
    });
    gatewaySocket = socket;

    socket.on('open', () => {
      if (gatewaySocket !== socket) return;
      reconnectAttempts = 0;
      platformStatus.connected = true;
      platformStatus.connecting = false;
      platformStatus.lastConnectedAt = new Date().toISOString();
      addPlatformLog('INFO', `Gateway 已连接（账号：${account.name}）`);
      // 广播平台状态变化
      broadcastPlatformStatus({ connected: true, accountId: account.id, accountName: account.name });
    });

    socket.on('message', (raw: WebSocket.RawData) => {
      if (gatewaySocket !== socket) return;
      handleGatewayMessage(raw);
    });

    socket.on('close', (code: number, reasonBuf: Buffer) => {
      if (gatewaySocket !== socket) {
        return;
      }

      const reason = reasonBuf?.toString?.() || '';
      platformStatus.connected = false;
      platformStatus.connecting = false;
      clearGatewayRuntime();
      gatewaySocket = null;
      addPlatformLog('WARN', `Gateway 已断开 code=${code}${reason ? ` reason=${reason}` : ''}`);
      // 广播平台状态变化
      broadcastPlatformStatus({ connected: false });

      if (suppressReconnectCloseCount > 0) {
        suppressReconnectCloseCount -= 1;
        addPlatformLog('INFO', `已忽略一次预期内断连 close code=${code}`);
        return;
      }

      scheduleReconnect(false, `close code=${code}`);
    });

    socket.on('error', (error: Error) => {
      if (gatewaySocket !== socket) return;
      setPlatformError(error);
      addPlatformLog('WARN', `Gateway 连接异常: ${error.message}`);

      scheduleReconnect(false, `socket error: ${error.message}`);
      try {
        socket.terminate();
      } catch {
        // no-op
      }
    });
  } catch (error) {
    platformStatus.connected = false;
    platformStatus.connecting = false;
    setPlatformError(error);

    const msg = error instanceof Error ? error.message : String(error);
    const canRetry = !msg.includes('账号缺少 AppID 或 AppSecret') && !msg.includes('该账号未配置 AppID 或 AppSecret');
    const shouldRefreshToken = /401|403|token|invalid session|认证|鉴权/i.test(msg);
    if (canRetry) {
      scheduleReconnect(shouldRefreshToken, '连接流程失败');
    }

    throw error;
  }
}

/**
 * 断开 Gateway 连接
 */
export function disconnectGateway(autoReconnect = true): void {
  platformStatus.connecting = false;
  platformStatus.connected = false;
  clearGatewayRuntime();
  gatewayIdentifyPayload = null;

  const reconnectAccountId = platformStatus.connectedAccountId;

  if (gatewaySocket) {
    suppressReconnectCloseCount += 1;
    gatewaySocket.close();
    gatewaySocket = null;
  }

  if (autoReconnect) {
    addPlatformLog('INFO', '已断开 Gateway，按策略自动重连');
    if (reconnectAccountId) {
      scheduleReconnect(false, 'disconnect 后自动重连');
    }
  } else {
    addPlatformLog('INFO', '已断开 Gateway，不自动重连');
  }
}

// 导出群组管理相关函数
export { getGroupMembers, muteGroupMember, unmuteGroupMember, kickGroupMember } from './gateway-group.js';
