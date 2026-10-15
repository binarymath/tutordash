import { useQuery } from '@tanstack/react-query';
import { fetchDisciplinaSheet } from '../services/api';

export const useDisciplinaSheet = (url) => {
  return useQuery({
    queryKey: ['disciplinaSheet', url],
    queryFn: () => fetchDisciplinaSheet(url),
    enabled: !!url,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};
