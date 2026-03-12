import WebSocket from 'ws';
import { BotAccount, Message } from '../../types.js';
import {
  accounts,
  addPlatformLog,
  ensureConversationForInbound,
  fetchAppAccessToken,
  gatewayIntents,
  messages,
  platformStatus,
  qqAuthPrefix,
  qqGatewayApiBase,
  qqGatewayUrlFromEnv,
  qqMessageApiTemplate,
  setPlatformError
} from '../../core/store.js';
import { broadcastNewMessage, broadcastPlatformStatus } from '../sse/routes.js';

const OP_RECONNECT = 7;
const OP_INVALID_SESSION = 9;
const OP_HELLO = 10;
const OP_HEARTBEAT_ACK = 11;
const DEFAULT_INTENTS = (1 << 0) | (1 << 10) | (1 << 12) | (1 << 25) | (1 << 26) | (1 << 27);
const FACE_PATTERN = /<faceType=\d+,faceId="[^"]+",ext="[^"]+">/g;

function sanitizeInboundContent(input: unknown) {
  if (input === null || input === undefined) return '';
  const text = String(input)
    .replace(/^\/+/, '')
    .replace(FACE_PATTERN, '')
    .replace(/^<@!?\w+>\s*/g, '')
    .trim();
  return text;
}

function readPath(source: any, path: string) {
  return path.split('/').reduce<any>((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), source);
}

function firstNonEmptyString(...candidates: unknown[]) {
  for (const x of candidates) {
    if (typeof x === 'string' && x.trim()) return x.trim();
  }
  return null;
}

function appendImageFromAttachments(content: string, attachments: unknown) {
  if (!Array.isArray(attachments)) return content;
  for (const att of attachments) {
    const item = att as Record<string, unknown>;
    const contentType = String(item?.content_type || '');
    if (contentType.startsWith('image/')) {
      const url = firstNonEmptyString(item?.url, item?.proxy_url);
      if (!url) return content;
      const imageToken = `<${url}>`;
      return content ? `${content}${imageToken}` : imageToken;
    }
  }
  return content;
}

function safePayloadSnippet(payload: unknown, maxLength = 600) {
  try {
    const text = JSON.stringify(payload);
    if (!text) return '';
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  } catch {
    return '[unserializable-payload]';
  }
}

type ParsedInboundEvent = {
  shouldRecord: boolean;
  peerType: 'user' | 'group';
  peerId: string;
  peerOpenId: string | null;
  peerName: string;
  content: string;
  inboundMsgId: string | null;
};

function parseInboundEvent(payload: { t?: string; id?: string; d?: any }): ParsedInboundEvent | null {
  const eventType = payload.t || '';
  const d = payload.d || {};
  const baseInboundMsgId = firstNonEmptyString(d?.id, payload.id);

  if (eventType === 'GROUP_AT_MESSAGE_CREATE') {
    const groupId = firstNonEmptyString(d?.group_openid, d?.group_id);
    if (!groupId) return null;

    const raw = firstNonEmptyString(d?.content, d?.message?.content, d?.data?.content, d?.raw_message?.content);
    const sanitized = sanitizeInboundContent(raw);
    const withImage = appendImageFromAttachments(sanitized, d?.attachments);

    const peerName =
      firstNonEmptyString(d?.author?.member_openid, d?.author?.username, d?.author?.id) || `群聊 ${groupId}`;

    return {
      shouldRecord: true,
      peerType: 'group',
      peerId: groupId,
      peerOpenId: firstNonEmptyString(d?.group_openid, d?.group_id),
      peerName,
      content: withImage || '[非文本消息]',
      inboundMsgId: baseInboundMsgId
    };
  }

  if (eventType === 'C2C_MESSAGE_CREATE') {
    const userId = firstNonEmptyString(
      d?.author?.member_openid,
      d?.author?.user_openid,
      d?.user_openid,
      d?.author?.id,
      d?.id
    );
    if (!userId) return null;

    const raw = firstNonEmptyString(d?.content, d?.message?.content, d?.data?.content, d?.raw_message?.content);
    const sanitized = sanitizeInboundContent(raw);
    const withImage = appendImageFromAttachments(sanitized, d?.attachments);

    const peerName = firstNonEmptyString(d?.author?.username, d?.author?.id, d?.author?.member_openid) || `用户 ${userId}`;

    return {
      shouldRecord: true,
      peerType: 'user',
      peerId: userId,
      peerOpenId: firstNonEmptyString(d?.author?.user_openid, d?.user_openid),
      peerName,
      content: withImage || '[非文本消息]',
      inboundMsgId: baseInboundMsgId
    };
  }

  if (eventType === 'INTERACTION_CREATE') {
    if (Number(readPath(payload, 'd/type')) === 13) {
      return null;
    }

    const chatType = Number(readPath(payload, 'd/chat_type'));
    const scene = String(readPath(payload, 'd/scene') || '');
    const isGroup = chatType === 1 || scene === 'group';

    const groupId = firstNonEmptyString(readPath(payload, 'd/group_openid'), readPath(payload, 'd/group_id'));
    const userId = firstNonEmptyString(
      readPath(payload, 'd/group_member_openid'),
      readPath(payload, 'd/user_openid'),
      readPath(payload, 'd/author/id')
    );

    const peerId = isGroup ? groupId : userId;
    if (!peerId) return null;

    const content = sanitizeInboundContent(readPath(payload, 'd/data/resolved/button_data')) || '[交互事件]';

    return {
      shouldRecord: true,
      peerType: isGroup ? 'group' : 'user',
      peerId,
      peerOpenId: firstNonEmptyString(groupId, userId),
      peerName: isGroup ? `群聊 ${peerId}` : `用户 ${peerId}`,
      content,
      inboundMsgId: firstNonEmptyString(payload.id)
    };
  }

  if (eventType.includes('MESSAGE')) {
    const groupId = firstNonEmptyString(d?.group_openid, d?.group_id, d?.channel_id);
    const userId = firstNonEmptyString(d?.author?.member_openid, d?.author?.user_openid, d?.user_openid, d?.author?.id);
    const peerId = groupId || userId;
    if (!peerId) return null;

    const raw = firstNonEmptyString(d?.content, d?.message?.content, d?.data?.content, d?.raw_message?.content);
    const sanitized = sanitizeInboundContent(raw);
    const withImage = appendImageFromAttachments(sanitized, d?.attachments);

    return {
      shouldRecord: true,
      peerType: groupId ? 'group' : 'user',
      peerId,
      peerOpenId: firstNonEmptyString(groupId, userId),
      peerName: firstNonEmptyString(d?.author?.username, d?.author?.id) || `${groupId ? '群聊' : '用户'} ${peerId}`,
      content: withImage || '[非文本消息]',
      inboundMsgId: baseInboundMsgId
    };
  }

  return null;
}

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

async function fetchGatewayUrl(appId: string, token: string) {
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

function clearGatewayRuntime() {
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

function scheduleReconnect(forceRefreshToken = false, reason?: string) {
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

async function handleGatewayMessage(raw: WebSocket.RawData) {
  try {
    const payload = JSON.parse(String(raw)) as {
      op?: number;
      s?: number;
      t?: string;
      id?: string;
      d?: any;
    };

    if (typeof payload.s === 'number') {
      lastSeq = payload.s;
    }

    if (payload.op === OP_HELLO && payload.d?.heartbeat_interval) {
      const interval = Number(payload.d.heartbeat_interval);
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
        const eventId = firstNonEmptyString(payload.d?.id, payload.id);
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

export async function connectGateway(accountId: string, forceRefreshToken = false) {
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

export function disconnectGateway(autoReconnect = true) {
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

// 消息发送频率限制器
const sendRateLimiter = {
  lastSendTime: 0,
  minInterval: 500, // 最小发送间隔 500ms
  queue: [] as { resolve: () => void; reject: (err: Error) => void }[],
  processing: false,

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastSendTime;

    if (elapsed >= this.minInterval && this.queue.length === 0) {
      this.lastSendTime = now;
      return;
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.processQueue();
    });
  },

  processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const processNext = () => {
      if (this.queue.length === 0) {
        this.processing = false;
        return;
      }

      const now = Date.now();
      const elapsed = now - this.lastSendTime;
      const waitTime = Math.max(0, this.minInterval - elapsed);

      setTimeout(() => {
        this.lastSendTime = Date.now();
        const item = this.queue.shift();
        if (item) {
          item.resolve();
        }
        processNext();
      }, waitTime);
    };

    processNext();
  }
};

// msg_id 过期时间检测（QQ平台 msg_id 有效期约 5 分钟）
const MSG_ID_MAX_AGE_MS = 4 * 60 * 1000; // 4 分钟，留有余量

// 存储消息接收时间
const msgIdTimestamps = new Map<string, number>();

export function recordMsgIdTimestamp(msgId: string) {
  msgIdTimestamps.set(msgId, Date.now());
  // 清理过期的记录
  const cutoff = Date.now() - MSG_ID_MAX_AGE_MS * 2;
  for (const [id, ts] of msgIdTimestamps.entries()) {
    if (ts < cutoff) {
      msgIdTimestamps.delete(id);
    }
  }
}

function isMsgIdValid(msgId: string | undefined): boolean {
  if (!msgId) return false;
  const timestamp = msgIdTimestamps.get(msgId);
  if (!timestamp) {
    // 没有记录时间，假设可能过期
    return false;
  }
  return Date.now() - timestamp < MSG_ID_MAX_AGE_MS;
}

export async function trySendToQQ(
  account: BotAccount,
  targetId: string,
  text: string,
  msgId?: string,
  targetType: 'user' | 'group' = 'user'
) {
  // 等待发送槽位
  await sendRateLimiter.waitForSlot();

  const token = await fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const fallbackPath = targetType === 'group' ? `/v2/groups/{targetId}/messages` : `/v2/users/{targetId}/messages`;
  const template = qqMessageApiTemplate || `${baseApi}${fallbackPath}`;
  const url = template.replace('{targetId}', encodeURIComponent(targetId));

  if (!qqMessageApiTemplate) {
    addPlatformLog('WARN', `未配置 QQ_MESSAGE_API_TEMPLATE，已自动使用默认发送端点：${fallbackPath}`);
  }

  // 检查 msg_id 是否有效（未过期）
  const useMsgId = isMsgIdValid(msgId);
  if (msgId && !useMsgId) {
    addPlatformLog('WARN', `msg_id 已过期或未知，将不使用引用回复: ${msgId.slice(0, 50)}...`);
  }

  const payloadCandidates: Record<string, unknown>[] = [];
  const basePayload: Record<string, unknown> = {
    msg_type: 0,
    msg_seq: Math.floor(Math.random() * 900000) + 100000,
    content: text
  };

  // 只有有效的 msg_id 才用于回复
  if (useMsgId) {
    payloadCandidates.push({ ...basePayload, msg_id: msgId });
    payloadCandidates.push({ msg_type: 0, content: text, msg_id: msgId });
  }
  // 始终添加不带 msg_id 的备选方案
  payloadCandidates.push(basePayload);
  payloadCandidates.push({ msg_type: 0, content: text });

  let lastError = '';
  let retryCount = 0;
  const maxRetries = 3;

  for (let i = 0; i < payloadCandidates.length && retryCount < maxRetries; i += 1) {
    const payload = payloadCandidates[i];

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `${qqAuthPrefix} ${token}`,
          'X-Union-Appid': account.appId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        addPlatformLog(
          'INFO',
          `消息已投递到 QQ 平台: target=${targetId}${useMsgId && msgId ? ` reply_msg_id=${msgId}` : ''}（账号：${account.name}，payload#${i + 1}）`
        );
        return { mode: 'platform' as const };
      }

      const detail = await res.text().catch(() => '');
      lastError = `HTTP ${res.status}${detail ? ` ${detail.slice(0, 300)}` : ''}`;

      // 检查是否为 msg_id 过期错误 (40034005)
      if (detail.includes('40034005') || detail.includes('msg_id已过期')) {
        addPlatformLog('WARN', `msg_id 已过期，尝试不使用引用回复发送`);
        // 跳过带 msg_id 的 payload，直接使用不带 msg_id 的
        const noMsgIdIndex = payloadCandidates.findIndex((p) => !p.msg_id);
        if (noMsgIdIndex > i) {
          i = noMsgIdIndex - 1; // -1 因为循环会 +1
          continue;
        }
      }

      // 检查是否为频率限制错误 (22007)
      if (detail.includes('22007') || detail.includes('exceed limit')) {
        retryCount += 1;
        addPlatformLog('WARN', `发送频率受限，等待后重试 (${retryCount}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, 1000 * retryCount)); // 递增等待时间
        i -= 1; // 重试当前 payload
        continue;
      }

      // 参数无效错误，尝试下一个 payload
      if ((res.status === 500 && detail.includes('11255')) || res.status === 400) {
        if (i < payloadCandidates.length - 1) {
          addPlatformLog('WARN', `发送参数无效，自动尝试兼容 payload#${i + 2}`);
        }
        continue;
      }

      // 其他错误直接退出
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      retryCount += 1;
      if (retryCount < maxRetries) {
        addPlatformLog('WARN', `网络错误，重试中 (${retryCount}/${maxRetries}): ${lastError}`);
        await new Promise((r) => setTimeout(r, 500 * retryCount));
        i -= 1;
      }
    }
  }

  throw new Error(`调用 QQ 发送接口失败: ${lastError}`);
}

/**
 * 撤回消息
 * QQ 官方 API: DELETE /v2/users/{openid}/messages/{message_id} 或 DELETE /v2/groups/{group_openid}/messages/{message_id}
 */
export async function recallMessage(
  account: BotAccount,
  targetId: string,
  messageId: string,
  targetType: 'user' | 'group' = 'user'
): Promise<{ success: boolean }> {
  const token = await fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const path = targetType === 'group'
    ? `/v2/groups/${encodeURIComponent(targetId)}/messages/${encodeURIComponent(messageId)}`
    : `/v2/users/${encodeURIComponent(targetId)}/messages/${encodeURIComponent(messageId)}`;
  const url = `${baseApi}${path}`;

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `${qqAuthPrefix} ${token}`,
        'X-Union-Appid': account.appId
      }
    });

    if (res.ok) {
      addPlatformLog('INFO', `消息撤回成功: target=${targetId} msg=${messageId}`);
      return { success: true };
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `消息撤回失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    return { success: false };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `消息撤回异常: ${errMsg}`);
    return { success: false };
  }
}

/**
 * 上传图片到 QQ 平台
 * QQ 官方 API: POST /v2/users/{openid}/files 或 POST /v2/groups/{group_openid}/files
 */
export async function uploadImage(
  account: BotAccount,
  targetId: string,
  fileBuffer: Buffer,
  fileName: string,
  targetType: 'user' | 'group' = 'user'
): Promise<{ success: boolean; fileInfo?: string }> {
  const token = await fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const path = targetType === 'group'
    ? `/v2/groups/${encodeURIComponent(targetId)}/files`
    : `/v2/users/${encodeURIComponent(targetId)}/files`;
  const url = `${baseApi}${path}`;

  try {
    // 构建 multipart/form-data
    const boundary = `----FormBoundary${Date.now()}`;
    const formData = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
      'Content-Type: image/png',
      '',
    ].join('\r\n');
    const formDataEnd = `\r\n--${boundary}--\r\n`;

    const body = Buffer.concat([
      Buffer.from(formData, 'utf-8'),
      Buffer.from('\r\n', 'utf-8'),
      fileBuffer,
      Buffer.from(formDataEnd, 'utf-8'),
    ]);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `${qqAuthPrefix} ${token}`,
        'X-Union-Appid': account.appId,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    if (res.ok) {
      const data = await res.json() as { file_info?: string };
      addPlatformLog('INFO', `图片上传成功: target=${targetId} file=${fileName}`);
      return { success: true, fileInfo: data.file_info };
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `图片上传失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    return { success: false };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `图片上传异常: ${errMsg}`);
    return { success: false };
  }
}

/**
 * 发送图片消息
 * QQ 官方 API: POST /v2/users/{openid}/messages 或 POST /v2/groups/{group_openid}/messages
 */
export async function sendImageMessage(
  account: BotAccount,
  targetId: string,
  fileInfo: string,
  targetType: 'user' | 'group' = 'user'
): Promise<{ success: boolean }> {
  // 等待发送槽位
  await sendRateLimiter.waitForSlot();

  const token = await fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const path = targetType === 'group'
    ? `/v2/groups/${encodeURIComponent(targetId)}/messages`
    : `/v2/users/${encodeURIComponent(targetId)}/messages`;
  const url = `${baseApi}${path}`;

  try {
    const payload = {
      msg_type: 7, // 富媒体消息
      msg_id: `img_${Date.now()}`,
      content: '',
      media: {
        file_info: fileInfo,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `${qqAuthPrefix} ${token}`,
        'X-Union-Appid': account.appId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      addPlatformLog('INFO', `图片消息已发送: target=${targetId}`);
      return { success: true };
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `图片消息发送失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    return { success: false };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `图片消息发送异常: ${errMsg}`);
    return { success: false };
  }
}

/**
 * 获取群成员列表
 * QQ 官方 API: GET /v2/groups/{group_openid}/members
 */
export async function getGroupMembers(
  account: BotAccount,
  groupId: string
): Promise<{ success: boolean; members?: Array<{ id: string; name: string; avatar?: string }> }> {
  const token = await fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const url = `${baseApi}/v2/groups/${encodeURIComponent(groupId)}/members`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `${qqAuthPrefix} ${token}`,
        'X-Union-Appid': account.appId,
      },
    });

    if (res.ok) {
      const data = await res.json();
      addPlatformLog('INFO', `获取群成员列表: group=${groupId}, count=${data.members?.length || 0}`);
      return {
        success: true,
        members: data.members || []
      };
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `获取群成员列表失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    return { success: false };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `获取群成员列表异常: ${errMsg}`);
    return { success: false };
  }
}

/**
 * 禁言群成员
 * QQ 官方 API: POST /v2/groups/{group_openid}/members/{user_openid}/mute
 */
export async function muteGroupMember(
  account: BotAccount,
  groupId: string,
  userId: string,
  durationSeconds: number
): Promise<{ success: boolean }> {
  const token = await fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const url = `${baseApi}/v2/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}/mute`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `${qqAuthPrefix} ${token}`,
        'X-Union-Appid': account.appId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        duration: durationSeconds
      }),
    });

    if (res.ok) {
      addPlatformLog('INFO', `禁言群成员: group=${groupId}, user=${userId}, duration=${durationSeconds}s`);
      return { success: true };
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `禁言群成员失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    return { success: false };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `禁言群成员异常: ${errMsg}`);
    return { success: false };
  }
}

/**
 * 解除禁言群成员
 * QQ 官方 API: DELETE /v2/groups/{group_openid}/members/{user_openid}/mute
 */
export async function unmuteGroupMember(
  account: BotAccount,
  groupId: string,
  userId: string
): Promise<{ success: boolean }> {
  const token = await fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const url = `${baseApi}/v2/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}/mute`;

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `${qqAuthPrefix} ${token}`,
        'X-Union-Appid': account.appId,
      },
    });

    if (res.ok) {
      addPlatformLog('INFO', `解除禁言群成员: group=${groupId}, user=${userId}`);
      return { success: true };
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `解除禁言群成员失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    return { success: false };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `解除禁言群成员异常: ${errMsg}`);
    return { success: false };
  }
}

/**
 * 踢出群成员
 * QQ 官方 API: DELETE /v2/groups/{group_openid}/members/{user_openid}
 */
export async function kickGroupMember(
  account: BotAccount,
  groupId: string,
  userId: string
): Promise<{ success: boolean }> {
  const token = await fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const url = `${baseApi}/v2/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`;

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `${qqAuthPrefix} ${token}`,
        'X-Union-Appid': account.appId,
      },
    });

    if (res.ok) {
      addPlatformLog('INFO', `踢出群成员: group=${groupId}, user=${userId}`);
      return { success: true };
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `踢出群成员失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    return { success: false };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `踢出群成员异常: ${errMsg}`);
    return { success: false };
  }
}
