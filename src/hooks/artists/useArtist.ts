import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { QueryKeys } from '@/enums/queryKeys';
import { Artist } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useLibrary } from '@/contexts/LibraryContext';

type UseArtistResult = {
  artist: Artist | null;
  isLoading: boolean;
  error: Error | null;
};

export function useArtist(id: string): UseArtistResult {
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const { artists } = useLibrary();
  const cachedArtist = artists.find(a => a.id === id) ?? null;

  const query = useQuery<Artist, Error>({
    queryKey: [QueryKeys.Artist, activeServer?.id, id],
    queryFn: () => api.artists.get(id),
    enabled: !!activeServer?.id && !!id,
    staleTime: staleTime.artists,
  });

  return {
    artist: query.data ?? cachedArtist,
    isLoading: query.isLoading && cachedArtist === null,
    error: query.error ?? null,
  };
}
