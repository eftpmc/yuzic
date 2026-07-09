import { useSelector } from 'react-redux';
import { QueryKeys } from '@/enums/queryKeys';
import { AlbumBase, Song } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useLibrary } from '@/contexts/LibraryContext';
import { hasArrayData, useOfflineFirstQuery } from '@/hooks/useOfflineFirstQuery';

type UseStarredAlbumsResult = {
  albums: AlbumBase[];
  isLoading: boolean;
  error: Error | null;
};

// Shares a single query (and cache entry) with useStarredSongs — see the
// comment there for why the queryKey/queryFn must stay identical.
export function useStarredAlbums(): UseStarredAlbumsResult {
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const { starred: libraryStarred, starredAlbums: libraryStarredAlbums } = useLibrary();

  const query = useOfflineFirstQuery<{ songs: Song[]; albums: AlbumBase[] }>({
    queryKey: [QueryKeys.Starred, activeServer?.id],
    queryFn: api.starred.list,
    enabled: !!activeServer?.id,
    staleTime: staleTime.starred,
    fallbackData: { songs: libraryStarred, albums: libraryStarredAlbums },
    hasFallbackData: value => hasArrayData(value.songs) || hasArrayData(value.albums),
  });

  return {
    albums: query.data.albums,
    isLoading: query.isLoading,
    error: query.error,
  };
}
