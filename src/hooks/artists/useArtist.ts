import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/enums/queryKeys';
import { Artist } from '@/types';
import { useApi } from '@/api';

type UseArtistResult = {
  artist: Artist | null;
  isLoading: boolean;
  error: Error | null;
};

export function useArtist(id: string): UseArtistResult {
  const api = useApi();

  const query = useQuery<Artist, Error>({
    queryKey: [QueryKeys.Artist, id],
    queryFn: () => api.artists.get(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });

  return {
    artist: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ?? null,
  };
}