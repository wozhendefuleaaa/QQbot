import { useState, useCallback } from 'react';
import { api } from '../services/api';

export function useApi<T>(url: string, options?: RequestInit) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api<T>(url, options);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  const mutate = useCallback(async (data: any, mutateOptions?: { onError?: (error: Error) => void }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api<T>(url, {
        ...options,
        method: options?.method || 'POST',
        body: JSON.stringify(data)
      });
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      if (mutateOptions?.onError && err instanceof Error) {
        mutateOptions.onError(err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  const mutateAsync = mutate;

  return { 
    data, 
    loading: loading, 
    isLoading: loading, 
    error, 
    fetchData, 
    mutate, 
    mutateAsync,
    isPending: loading
  };
}

// 账号相关 hooks
export function useAccounts() {
  return useApi<any[]>('/api/accounts');
}

// 插件相关 hooks
export function usePlugins() {
  return useApi<any[]>('/api/plugins');
}

// 插件权限矩阵相关 hooks
export function usePluginPermissionMatrix(accountId: string) {
  return useApi<any>(`/api/plugins/permission-matrix?accountId=${accountId}`);
}

export function useAddGroupToMatrix() {
  return useApi<any>('/api/plugins/permission-matrix/group', {
    method: 'POST'
  });
}

export function useRemoveGroupFromMatrix() {
  return useApi<any>('/api/plugins/permission-matrix/group', {
    method: 'DELETE'
  });
}

export function useTogglePluginPermission() {
  return useApi<any>('/api/plugins/permission-matrix/toggle', {
    method: 'POST'
  });
}

export function useBatchTogglePluginPermission() {
  return useApi<any>('/api/plugins/permission-matrix/batch-toggle', {
    method: 'POST'
  });
}

// 联系人相关 hooks
export function useContacts() {
  return useApi<any>('/api/contacts');
}

// 云崽权限相关 hooks
export function useYunzaiPermission() {
  return useApi<any>('/api/yunzai/permission');
}

export function useAddYunzaiMaster() {
  return useApi<any>('/api/yunzai/permission/master', {
    method: 'POST'
  });
}

export function useAddYunzaiAdmin() {
  return useApi<any>('/api/yunzai/permission/admin', {
    method: 'POST'
  });
}

export function useRemoveYunzaiMaster() {
  return useApi<any>('/api/yunzai/permission/master', {
    method: 'DELETE'
  });
}

export function useRemoveYunzaiAdmin() {
  return useApi<any>('/api/yunzai/permission/admin', {
    method: 'DELETE'
  });
}
