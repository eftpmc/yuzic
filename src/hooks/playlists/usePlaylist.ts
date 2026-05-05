import { useSelector } from 'react-redux';
import { QueryKeys } from '@/enums/queryKeys';
import { Playlist } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useLibrary } from '@/contexts/LibraryContext';
import { hasValue, useOfflineFirstQuery } from '@/hooks/useOfflineFirstQuery';

type UsePlaylistResult = {
  playlist: Playlist | null;
  isLoading: boolean;
  error: Error | null;
};

export function usePlaylist(id: string): UsePlaylistResult {
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const { playlists } = useLibrary();
  const cachedPlaylist = playlists.find(p => p.id === id) ?? null;

  const query = useOfflineFirstQuery<Playlist | null>({
    queryKey: [QueryKeys.Playlist, activeServer?.id, id],
    queryFn: async () => api.playlists.get(id),
    enabled: !!activeServer?.id && !!id,
    staleTime: staleTime.playlists,
    fallbackData: cachedPlaylist,
    hasFallbackData: hasValue,
  });

  return {
    playlist: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
