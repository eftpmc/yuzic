import { useSelector } from 'react-redux';
import { QueryKeys } from '@/enums/queryKeys';
import { Artist } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useLibrary } from '@/contexts/LibraryContext';
import { hasValue, useOfflineFirstQuery } from '@/hooks/useOfflineFirstQuery';

type UseArtistResult = {
  artist: Artist | null;
  isLoading: boolean;
  error: Error | null;
  /** True when showing library-synced data because the server couldn't be asked. */
  degraded: boolean;
};

export function useArtist(id: string): UseArtistResult {
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const { artists } = useLibrary();
  const cachedArtist = artists.find(a => a.id === id) ?? null;

  const query = useOfflineFirstQuery<Artist | null>({
    queryKey: [QueryKeys.Artist, activeServer?.id, id],
    queryFn: async () => api.artists.get(id),
    enabled: !!activeServer?.id && !!id,
    staleTime: staleTime.artists,
    fallbackData: cachedArtist,
    hasFallbackData: hasValue,
  });

  return {
    artist: query.data,
    isLoading: query.isLoading,
    error: query.error,
    degraded: query.degraded,
  };
}
