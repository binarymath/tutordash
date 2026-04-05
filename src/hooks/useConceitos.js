import { useQuery } from '@tanstack/react-query';
import { fetchConceitos } from '../services/api';

export const useConceitos = (url) => {
  return useQuery({
    queryKey: ['conceitos', url],
    queryFn: () => fetchConceitos(url),
    enabled: !!url,
    refetchInterval: 5 * 60 * 1000,
  });
};
