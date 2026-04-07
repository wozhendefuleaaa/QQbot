import { BotAccount } from '../../types.js';
import { addPlatformLog } from '../../core/store.js';
import { qqAuthPrefix, qqGatewayApiBase } from '../../core/store.js';

// 频道类型常量
export const CHANNEL_TYPE = {
  TEXT: 0,           // 文字子频道
  VOICE: 2,          // 语音子频道
  STAGE: 3,          // 舞台子频道
  CATEGORY: 4,       // 分类频道
  FORUM: 5,          // 论坛子频道
  LIVE: 10,          // 直播子频道
  APPLICATION: 11,   // 应用子频道
  GAME: 12,          // 游戏子频道
} as const;

// 子频道权限常量
export const CHANNEL_PERMISSION = {
  VIEW: 1,           // 查看权限
  SEND_MESSAGE: 2,   // 发送消息权限
  MANAGE: 4,         // 管理权限
} as const;

// 用户信息接口
export interface QQUserInfo {
  openid: string;
  nickname: string;
  avatar: string;
  unionid?: string;
}

// 频道信息接口
export interface QQGuildInfo {
  id: string;
  name: string;
  icon: string;
  owner_id: string;
  member_count: number;
  max_members: number;
  description: string;
  joined_at: string;
  permissions: number;
}

// 子频道信息接口
export interface QQChannelInfo {
  id: string;
  guild_id: string;
  name: string;
  type: number;
  position: number;
  parent_id: string;
  owner_id: string;
  topic: string;
  slow_mode: number;
  permission_overwrites: Array<{
    id: string;
    type: number;
    allow: number;
    deny: number;
  }>;
  permissions: number;
}

// 创建子频道请求接口
export interface CreateChannelRequest {
  name: string;
  type: number;
  parent_id?: string;
  position?: number;
  topic?: string;
  slow_mode?: number;
  permission_overwrites?: Array<{
    id: string;
    type: number;
    allow: number;
    deny: number;
  }>;
}

// 修改子频道请求接口
export interface UpdateChannelRequest {
  name?: string;
  type?: number;
  parent_id?: string;
  position?: number;
  topic?: string;
  slow_mode?: number;
  permission_overwrites?: Array<{
    id: string;
    type: number;
    allow: number;
    deny: number;
  }>;
}

/**
 * 获取用户详情
 * QQ 官方 API: GET /v2/users/{openid}/me
 */
export async function getUserInfo(
  account: BotAccount,
  openid: string
): Promise<QQUserInfo> {
  const token = await (await import('../../core/store.js')).fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const url = `${baseApi}/v2/users/${encodeURIComponent(openid)}/me`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `${qqAuthPrefix} ${token}`,
        'X-Union-Appid': account.appId,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json() as QQUserInfo;
      addPlatformLog('INFO', `获取用户详情成功: openid=${openid}`);
      return data;
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `获取用户详情失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    throw new Error(`获取用户详情失败: HTTP ${res.status}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `获取用户详情异常: ${errMsg}`);
    throw err;
  }
}

/**
 * 获取用户频道列表
 * QQ 官方 API: GET /v2/users/{openid}/guilds
 */
export async function getUserGuilds(
  account: BotAccount,
  openid: string
): Promise<QQGuildInfo[]> {
  const token = await (await import('../../core/store.js')).fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const url = `${baseApi}/v2/users/${encodeURIComponent(openid)}/guilds`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `${qqAuthPrefix} ${token}`,
        'X-Union-Appid': account.appId,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json() as QQGuildInfo[];
      addPlatformLog('INFO', `获取用户频道列表成功: openid=${openid}, count=${data.length}`);
      return data;
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `获取用户频道列表失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    throw new Error(`获取用户频道列表失败: HTTP ${res.status}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `获取用户频道列表异常: ${errMsg}`);
    throw err;
  }
}

/**
 * 获取频道详情
 * QQ 官方 API: GET /v2/guilds/{guild_id}
 */
export async function getGuildInfo(
  account: BotAccount,
  guildId: string
): Promise<QQGuildInfo> {
  const token = await (await import('../../core/store.js')).fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const url = `${baseApi}/v2/guilds/${encodeURIComponent(guildId)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `${qqAuthPrefix} ${token}`,
        'X-Union-Appid': account.appId,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json() as QQGuildInfo;
      addPlatformLog('INFO', `获取频道详情成功: guild_id=${guildId}`);
      return data;
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `获取频道详情失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    throw new Error(`获取频道详情失败: HTTP ${res.status}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `获取频道详情异常: ${errMsg}`);
    throw err;
  }
}

/**
 * 获取子频道列表
 * QQ 官方 API: GET /v2/guilds/{guild_id}/channels
 */
export async function getChannels(
  account: BotAccount,
  guildId: string
): Promise<QQChannelInfo[]> {
  const token = await (await import('../../core/store.js')).fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const url = `${baseApi}/v2/guilds/${encodeURIComponent(guildId)}/channels`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `${qqAuthPrefix} ${token}`,
        'X-Union-Appid': account.appId,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json() as QQChannelInfo[];
      addPlatformLog('INFO', `获取子频道列表成功: guild_id=${guildId}, count=${data.length}`);
      return data;
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `获取子频道列表失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    throw new Error(`获取子频道列表失败: HTTP ${res.status}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `获取子频道列表异常: ${errMsg}`);
    throw err;
  }
}

/**
 * 获取子频道详情
 * QQ 官方 API: GET /v2/channels/{channel_id}
 */
export async function getChannelInfo(
  account: BotAccount,
  channelId: string
): Promise<QQChannelInfo> {
  const token = await (await import('../../core/store.js')).fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const url = `${baseApi}/v2/channels/${encodeURIComponent(channelId)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `${qqAuthPrefix} ${token}`,
        'X-Union-Appid': account.appId,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json() as QQChannelInfo;
      addPlatformLog('INFO', `获取子频道详情成功: channel_id=${channelId}`);
      return data;
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `获取子频道详情失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    throw new Error(`获取子频道详情失败: HTTP ${res.status}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `获取子频道详情异常: ${errMsg}`);
    throw err;
  }
}

/**
 * 创建子频道
 * QQ 官方 API: POST /v2/guilds/{guild_id}/channels
 */
export async function createChannel(
  account: BotAccount,
  guildId: string,
  channel: CreateChannelRequest
): Promise<QQChannelInfo> {
  const token = await (await import('../../core/store.js')).fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const url = `${baseApi}/v2/guilds/${encodeURIComponent(guildId)}/channels`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `${qqAuthPrefix} ${token}`,
        'X-Union-Appid': account.appId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(channel)
    });

    if (res.ok) {
      const data = await res.json() as QQChannelInfo;
      addPlatformLog('INFO', `创建子频道成功: guild_id=${guildId}, channel_id=${data.id}`);
      return data;
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `创建子频道失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    throw new Error(`创建子频道失败: HTTP ${res.status}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `创建子频道异常: ${errMsg}`);
    throw err;
  }
}

/**
 * 修改子频道
 * QQ 官方 API: PATCH /v2/channels/{channel_id}
 */
export async function updateChannel(
  account: BotAccount,
  channelId: string,
  channel: UpdateChannelRequest
): Promise<QQChannelInfo> {
  const token = await (await import('../../core/store.js')).fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const url = `${baseApi}/v2/channels/${encodeURIComponent(channelId)}`;

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `${qqAuthPrefix} ${token}`,
        'X-Union-Appid': account.appId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(channel)
    });

    if (res.ok) {
      const data = await res.json() as QQChannelInfo;
      addPlatformLog('INFO', `修改子频道成功: channel_id=${channelId}`);
      return data;
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `修改子频道失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    throw new Error(`修改子频道失败: HTTP ${res.status}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `修改子频道异常: ${errMsg}`);
    throw err;
  }
}

/**
 * 删除子频道
 * QQ 官方 API: DELETE /v2/channels/{channel_id}
 */
export async function deleteChannel(
  account: BotAccount,
  channelId: string
): Promise<boolean> {
  const token = await (await import('../../core/store.js')).fetchAppAccessToken(account);
  const baseApi = qqGatewayApiBase.replace(/\/$/, '');
  const url = `${baseApi}/v2/channels/${encodeURIComponent(channelId)}`;

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `${qqAuthPrefix} ${token}`,
        'X-Union-Appid': account.appId,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      addPlatformLog('INFO', `删除子频道成功: channel_id=${channelId}`);
      return true;
    }

    const detail = await res.text().catch(() => '');
    addPlatformLog('WARN', `删除子频道失败: HTTP ${res.status} ${detail.slice(0, 200)}`);
    return false;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    addPlatformLog('ERROR', `删除子频道异常: ${errMsg}`);
    return false;
  }
}
