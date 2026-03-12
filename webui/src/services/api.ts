const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = [err.error, err.hint].filter(Boolean).join(' | ');
    throw new Error(message || `请求失败：${res.status}`);
  }

  return res.json() as Promise<T>;
}

export function fmtTime(input?: string | null) {
  if (!input) return '-';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleString('zh-CN');
}
