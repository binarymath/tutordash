import { useQuery } from '@tanstack/react-query';
import { fetchNotes } from '../services/api';

export const useNotes = (url) => {
  return useQuery({
    queryKey: ['notes', url],
    queryFn: () => fetchNotes(url),
    enabled: !!url,
    refetchInterval: 5 * 60 * 1000,
  });
};
