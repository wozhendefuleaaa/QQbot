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

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    signal: controller.signal,
  }).then(async (res) => {
    clearTimeout(timeoutId);
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        // 派发自定义事件，由 AuthContext 集中处理登出
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        throw new Error('登录已过期，请重新登录');
      }
      const err = await res.json().catch(() => ({}));
      const message = [err.error, err.hint].filter(Boolean).join(' | ');
      throw new Error(message || `请求失败：${res.status}`);
    }
    return res.json() as Promise<T>;
  }).catch((error) => {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接后重试');
    }
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('网络连接失败，请检查网络后重试');
    }
    throw error;
  });
}

export function fmtTime(input?: string | null) {
  if (!input) return '-';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleString('zh-CN');
}
