import { useQuery } from '@tanstack/react-query';
import type { SystemLog } from '../types';
import { api } from '../services/api';

export function useLogs() {
  const { data: logsData } = useQuery({
    queryKey: ['logs'],
    queryFn: () => api<{ items: SystemLog[] }>('/api/logs'),
    refetchInterval: 15000,
  });

  const logs = logsData?.items || [];

  return { logs };
}