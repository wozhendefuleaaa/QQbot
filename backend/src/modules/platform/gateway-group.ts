import { BotAccount } from '../../types.js';
import { addPlatformLog } from '../../core/store.js';
import { qqAuthPrefix, qqGatewayApiBase } from '../../core/store.js';

/**
 * 获取群成员列表
 * QQ 官方 API: GET /v2/groups/{group_openid}/members
 */
export async function getGroupMembers(
  account: BotAccount,
  groupId: string
): Promise<{ success: boolean; members?: Array<{ id: string; name: string; avatar?: string }> }> {
  const { fetchAppAccessToken } = await import('../../core/store.js');
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
      const data = await res.json() as { members?: Array<{ id: string; name: string; avatar?: string }> };
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
  const { fetchAppAccessToken } = await import('../../core/store.js');
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
  const { fetchAppAccessToken } = await import('../../core/store.js');
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
  const { fetchAppAccessToken } = await import('../../core/store.js');
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
