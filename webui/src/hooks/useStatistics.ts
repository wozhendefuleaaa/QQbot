import { useQuery } from '@tanstack/react-query';
import type { StatisticsSnapshot } from '../types';
import { api } from '../services/api';

export function useStatistics() {
  const { data: statisticsData } = useQuery({
    queryKey: ['statistics'],
    queryFn: () => api<StatisticsSnapshot>('/api/statistics/snapshot'),
    refetchInterval: false,
    staleTime: 10000,
  });

  return statisticsData || null;
}