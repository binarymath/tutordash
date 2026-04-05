import { useQuery } from '@tanstack/react-query';
import { fetchStudents } from '../services/api';

export const useStudents = (url) => {
  return useQuery({
    queryKey: ['students', url],
    queryFn: () => fetchStudents(url),
    enabled: !!url,
    refetchInterval: 5 * 60 * 1000, // Polling a cada 5 minutos
  });
};
