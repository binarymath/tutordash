import { useQuery } from '@tanstack/react-query';
import { fetchProvas } from '../services/api';

export const useProvas = (url) => {
  return useQuery({
    queryKey: ['provas', url],
    queryFn: () => fetchProvas(url),
    enabled: !!url,
    refetchInterval: 5 * 60 * 1000,
  });
};
