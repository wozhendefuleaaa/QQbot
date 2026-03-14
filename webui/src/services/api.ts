const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const TOKEN_KEY = 'auth_token';

function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> || {}),
  };

  // 添加认证头（如果 token 存在）
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  }).then(async (res) => {
    if (!res.ok) {
      // 处理 401 未授权错误
      if (res.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = '/';
        throw new Error('登录已过期，请重新登录');
      }
      const err = await res.json().catch(() => ({}));
      const message = [err.error, err.hint].filter(Boolean).join(' | ');
      throw new Error(message || `请求失败：${res.status}`);
    }

    return res.json() as Promise<T>;
  });
}

export function fmtTime(input?: string | null) {
  if (!input) return '-';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleString('zh-CN');
}
