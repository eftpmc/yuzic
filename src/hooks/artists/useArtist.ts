import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/enums/queryKeys';
import { Artist } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';

type UseArtistResult = {
  artist: Artist | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  isRefetching: boolean;
};

export function useArtist(id: string): UseArtistResult {
  const api = useApi();

  const query = useQuery<Artist, Error>({
    queryKey: [QueryKeys.Artist, id],
    queryFn: () => api.artists.get(id),
    enabled: !!id,
    staleTime: staleTime.artists,
    refetchOnMount: true,
  });

  return {
    artist: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ?? null,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}