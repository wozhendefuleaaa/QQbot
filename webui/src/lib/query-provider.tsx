import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// 创建 QueryClient 实例
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30秒内数据视为新鲜
      gcTime: 1000 * 60 * 5, // 5分钟后清理缓存
      retry: 2, // 失败重试2次
      refetchOnWindowFocus: false, // 窗口聚焦时不自动刷新
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
