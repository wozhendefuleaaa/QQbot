import { BotAccount } from '../../types.js';
import { addPlatformLog } from '../../core/store.js';
import { qqAuthPrefix, qqGatewayApiBase, qqMessageApiTemplate } from '../../core/store.js';

// QQ消息类型常量
export const QQ_MSG_TYPE = {
  TEXT: 0,           // 文本消息
  MARKDOWN: 2,       // Markdown消息
  ARK: 3,            // Ark消息
  EMBED: 4,          // Embed消息
  KEYBOARD: 5,       // 键盘消息
  MEDIA: 7,          // 富媒体消息（图片等）
} as const;

// Markdown消息结构
export interface QQMarkdownPayload {
  custom_template_id?: string;  // 自定义模板ID
  params?: Array<{              // 模板参数
    key: string;
    values: string[];
  }>;
}

// Ark消息结构
export interface QQArkPayload {
  template_id: string;          // 模板ID
  kv?: Array<{                  // 键值对
    key: string;
    value?: string;
    obj?: Array<{               // 对象数组
      obj_kv: Array<{
        key: string;
        value: string;
      }>;
    }>;
  }>;
}

// Embed消息结构
export interface QQEmbedPayload {
  title?: string;               // 标题
  prompt?: string;              // 提示
  thumbnail?: {                 // 缩略图
    url: string;
  };
  fields?: Array<{              // 字段
    name: string;
  }>;
}

// 键盘消息结构
export interface QQKeyboardPayload {
  rows: Array<{
    buttons: Array<{
      id?: string;
      render_data: {
        label: string;
        visited_label?: string;
        style?: number;
      };
      action: {
        type: number;
        permission?: {
          type: number;
          specify_role_ids?: string[];
          specify_user_ids?: string[];
        };
        click_limit?: number;
        data?: string;
        at_bot_show_channel_list?: boolean;
      };
    }>;
  }>;
}

// 统一消息载荷结构
export interface QQMessagePayload {
  msg_type: number;
  msg_seq?: number;
  msg_id?: string;
  content?: string;
  markdown?: QQMarkdownPayload;
  ark?: QQArkPayload;
  embed?: QQEmbedPayload;
  keyboard?: QQKeyboardPayload;
  media?: {
    file_info: string;
  };
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
  },

  clear() {
    this.queue.forEach(item => item.reject(new Error('Rate limiter cleared')));
    this.queue = [];
    this.processing = false;
  }
};

// msg_id 过期时间检测（QQ平台 msg_id 有效期约 5 分钟）
const MSG_ID_MAX_AGE_MS = 4 * 60 * 1000; // 4 分钟，留有余量

// 存储消息接收时间
const msgIdTimestamps = new Map<string, number>();

export function recordMsgIdTimestamp(msgId: string): void {
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

/**
 * 发送消息到 QQ 平台
 */
export async function trySendToQQ(
  account: BotAccount,
  targetId: string,
  text: string,
  msgId?: string,
  targetType: 'user' | 'group' = 'user'
): Promise<{ mode: 'platform' }> {
  // 等待发送槽位
  await sendRateLimiter.waitForSlot();

  const token = await (await import('../../core/store.js')).fetchAppAccessToken(account);
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
        return { mode: 'platform' };
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
  const token = await (await import('../../core/store.js')).fetchAppAccessToken(account);
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
  const token = await (await import('../../core/store.js')).fetchAppAccessToken(account);
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

  const token = await (await import('../../core/store.js')).fetchAppAccessToken(account);
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
      addPlatformLog('INFO', `图片消息发送成功: target=${targetId}`);
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
 * 发送Markdown消息
 * QQ 官方 API: POST /v2/users/{openid}/messages 或 POST /v2/groups/{group_openid}/messages
 * msg_type: 2
 */
export async function sendMarkdownMessage(
  account: BotAccount,
  targetId: string,
  markdown: QQMarkdownPayload,
  msgId?: string,
  targetType: 'user' | 'group' = 'user'
): Promise<{ success: boolean }> {
  // 等待发送槽位
  await sendRateLimiter.waitForSlot();

  const token = await (await import('../../core/store.js')).fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const path = targetType === 'group'
    ? `/v2/groups/${encodeURIComponent(targetId)}/messages`
    : `/v2/users/${encodeURIComponent(targetId)}/messages`;
  const url = `${baseApi}${path}`;

  // 检查 msg_id 是否有效
  const useMsgId = isMsgIdValid(msgId);

  try {
    const payload: QQMessagePayload = {
      msg_type: QQ_MSG_TYPE.MARKDOWN,
      msg_seq: Math.floor(Math.random() * 900000) + 100000,
      markdown,
    };

    if (useMsgId) {
      payload.msg_id = msgId;
    }

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
      addPlatformLog('INFO', `Markdown消息发送成功: target=${targetId}`);
      return { success: true };
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `Markdown消息发送失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    return { success: false };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `Markdown消息发送异常: ${errMsg}`);
    return { success: false };
  }
}

/**
 * 发送Ark消息
 * QQ 官方 API: POST /v2/users/{openid}/messages 或 POST /v2/groups/{group_openid}/messages
 * msg_type: 3
 */
export async function sendArkMessage(
  account: BotAccount,
  targetId: string,
  ark: QQArkPayload,
  msgId?: string,
  targetType: 'user' | 'group' = 'user'
): Promise<{ success: boolean }> {
  // 等待发送槽位
  await sendRateLimiter.waitForSlot();

  const token = await (await import('../../core/store.js')).fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const path = targetType === 'group'
    ? `/v2/groups/${encodeURIComponent(targetId)}/messages`
    : `/v2/users/${encodeURIComponent(targetId)}/messages`;
  const url = `${baseApi}${path}`;

  // 检查 msg_id 是否有效
  const useMsgId = isMsgIdValid(msgId);

  try {
    const payload: QQMessagePayload = {
      msg_type: QQ_MSG_TYPE.ARK,
      msg_seq: Math.floor(Math.random() * 900000) + 100000,
      ark,
    };

    if (useMsgId) {
      payload.msg_id = msgId;
    }

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
      addPlatformLog('INFO', `Ark消息发送成功: target=${targetId}`);
      return { success: true };
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `Ark消息发送失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    return { success: false };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `Ark消息发送异常: ${errMsg}`);
    return { success: false };
  }
}

/**
 * 发送Embed消息
 * QQ 官方 API: POST /v2/users/{openid}/messages 或 POST /v2/groups/{group_openid}/messages
 * msg_type: 4
 */
export async function sendEmbedMessage(
  account: BotAccount,
  targetId: string,
  embed: QQEmbedPayload,
  msgId?: string,
  targetType: 'user' | 'group' = 'user'
): Promise<{ success: boolean }> {
  // 等待发送槽位
  await sendRateLimiter.waitForSlot();

  const token = await (await import('../../core/store.js')).fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const path = targetType === 'group'
    ? `/v2/groups/${encodeURIComponent(targetId)}/messages`
    : `/v2/users/${encodeURIComponent(targetId)}/messages`;
  const url = `${baseApi}${path}`;

  // 检查 msg_id 是否有效
  const useMsgId = isMsgIdValid(msgId);

  try {
    const payload: QQMessagePayload = {
      msg_type: QQ_MSG_TYPE.EMBED,
      msg_seq: Math.floor(Math.random() * 900000) + 100000,
      embed,
    };

    if (useMsgId) {
      payload.msg_id = msgId;
    }

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
      addPlatformLog('INFO', `Embed消息发送成功: target=${targetId}`);
      return { success: true };
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `Embed消息发送失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    return { success: false };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `Embed消息发送异常: ${errMsg}`);
    return { success: false };
  }
}

/**
 * 发送键盘消息
 * QQ 官方 API: POST /v2/users/{openid}/messages 或 POST /v2/groups/{group_openid}/messages
 * msg_type: 5 (keyboard)
 */
export async function sendKeyboardMessage(
  account: BotAccount,
  targetId: string,
  keyboard: QQKeyboardPayload,
  content?: string,
  msgId?: string,
  targetType: 'user' | 'group' = 'user'
): Promise<{ success: boolean }> {
  // 等待发送槽位
  await sendRateLimiter.waitForSlot();

  const token = await (await import('../../core/store.js')).fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const path = targetType === 'group'
    ? `/v2/groups/${encodeURIComponent(targetId)}/messages`
    : `/v2/users/${encodeURIComponent(targetId)}/messages`;
  const url = `${baseApi}${path}`;

  // 检查 msg_id 是否有效
  const useMsgId = isMsgIdValid(msgId);

  try {
    // 使用inline_keyboard格式（QQ官方推荐格式）
    const payload: Record<string, unknown> = {
      msg_type: QQ_MSG_TYPE.KEYBOARD,
      msg_seq: Math.floor(Math.random() * 900000) + 100000,
      inline_keyboard: keyboard,
    };

    if (content) {
      payload.content = content;
    }

    if (useMsgId) {
      payload.msg_id = msgId;
    }

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
      addPlatformLog('INFO', `键盘消息发送成功: target=${targetId}`);
      return { success: true };
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `键盘消息发送失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    return { success: false };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `键盘消息发送异常: ${errMsg}`);
    return { success: false };
  }
}

/**
 * 发送混合消息（支持同时发送多种类型）
 * QQ 官方 API: POST /v2/users/{openid}/messages 或 POST /v2/groups/{group_openid}/messages
 */
export async function sendMixedMessage(
  account: BotAccount,
  targetId: string,
  payload: QQMessagePayload,
  targetType: 'user' | 'group' = 'user'
): Promise<{ success: boolean }> {
  // 等待发送槽位
  await sendRateLimiter.waitForSlot();

  const token = await (await import('../../core/store.js')).fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const path = targetType === 'group'
    ? `/v2/groups/${encodeURIComponent(targetId)}/messages`
    : `/v2/users/${encodeURIComponent(targetId)}/messages`;
  const url = `${baseApi}${path}`;

  try {
    // 确保有msg_seq
    if (!payload.msg_seq) {
      payload.msg_seq = Math.floor(Math.random() * 900000) + 100000;
    }

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
      addPlatformLog('INFO', `混合消息发送成功: target=${targetId} msg_type=${payload.msg_type}`);
      return { success: true };
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `混合消息发送失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    return { success: false };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `混合消息发送异常: ${errMsg}`);
    return { success: false };
  }
}

/**
 * 清理发送速率限制器
 */
export function clearSendRateLimiter(): void {
  sendRateLimiter.clear();
}
