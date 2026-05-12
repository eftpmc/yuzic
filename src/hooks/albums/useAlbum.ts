import { useSelector } from 'react-redux';
import { QueryKeys } from '@/enums/queryKeys';
import { Album } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useLibrary } from '@/contexts/LibraryContext';
import { hasValue, useOfflineFirstQuery } from '@/hooks/useOfflineFirstQuery';

type UseAlbumResult = {
  album: Album | null;
  isLoading: boolean;
  songsLoading: boolean;
  error: Error | null;
};

export function useAlbum(id: string): UseAlbumResult {
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const { albums } = useLibrary();
  const cachedAlbum = albums.find(a => a.id === id) ?? null;
  const fallbackAlbum = cachedAlbum ? { ...cachedAlbum, songs: [] } : null;

  const query = useOfflineFirstQuery<Album | null>({
    queryKey: [QueryKeys.Album, activeServer?.id, id],
    queryFn: async () => api.albums.get(id),
    enabled: !!activeServer?.id && !!id,
    staleTime: staleTime.albums,
    fallbackData: fallbackAlbum,
    hasFallbackData: hasValue,
  });

  return {
    album: query.data,
    isLoading: query.isLoading,
    songsLoading: query.query.isFetching && (query.data?.songs?.length ?? 0) === 0,
    error: query.error,
  };
}
