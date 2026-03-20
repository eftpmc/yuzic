import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { QueryKeys } from '@/enums/queryKeys';
import { Artist } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useLibrary } from '@/contexts/LibraryContext';

type UseArtistsResult = {
  artists: Artist[];
  isLoading: boolean;
  error: Error | null;
};

export function useArtists(): UseArtistsResult {
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const { artists: libraryArtists } = useLibrary();

  const query = useQuery<Artist[], Error>({
    queryKey: [QueryKeys.Artists, activeServer?.id],
    queryFn: api.artists.list,
    enabled: !!activeServer?.id,
    staleTime: staleTime.artists,
  });

  return {
    artists: query.data ?? libraryArtists,
    isLoading: query.isLoading && libraryArtists.length === 0,
    error: query.error ?? null,
  };
}
