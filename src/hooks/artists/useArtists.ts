import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/enums/queryKeys';
import { ArtistBase } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';

type UseArtistsResult = {
  artists: ArtistBase[];
  isLoading: boolean;
  error: Error | null;
};

export function useArtists(): UseArtistsResult {
  const api = useApi();

  const query = useQuery<ArtistBase[], Error>({
    queryKey: [QueryKeys.Artists],
    queryFn: api.artists.list,
    staleTime: staleTime.artists,
  });

  return {
    artists: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
  };
}