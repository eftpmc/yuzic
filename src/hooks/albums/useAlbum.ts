import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { QueryKeys } from '@/enums/queryKeys';
import { Album } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useLibrary } from '@/contexts/LibraryContext';
import { hasValue, useOfflineFirstQuery } from '@/hooks/useOfflineFirstQuery';
import { buildFallbackAlbumSongs } from './fallbackSongs';

type UseAlbumResult = {
  album: Album | null;
  isLoading: boolean;
  songsLoading: boolean;
  error: Error | null;
  /** True when showing library-synced data because the server couldn't be asked. */
  degraded: boolean;
};

export function useAlbum(id: string): UseAlbumResult {
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const { albums, tracks } = useLibrary();
  const cachedAlbum = albums.find(a => a.id === id) ?? null;

  // Hydrate the fallback's song list from the synced library tracks — a
  // header with zero songs reads as a bug when the real cause is the server
  // being unreachable. The songs resolve to local files or fresh stream URLs
  // at play time (PlayingContext.resolvePlayableSong).
  const fallbackSongs = useMemo(
    () => (cachedAlbum ? buildFallbackAlbumSongs(tracks, id) : []),
    [cachedAlbum, tracks, id]
  );
  const fallbackAlbum = cachedAlbum ? { ...cachedAlbum, songs: fallbackSongs } : null;

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
    degraded: query.degraded,
  };
}
