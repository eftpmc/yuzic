import { useSelector } from 'react-redux';
import { QueryKeys } from '@/enums/queryKeys';
import { AlbumBase } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useLibrary } from '@/contexts/LibraryContext';
import { hasArrayData, useOfflineFirstQuery } from '@/hooks/useOfflineFirstQuery';

type UseAlbumsResult = {
    albums: AlbumBase[];
  isLoading: boolean;
  error: Error | null;
};

export function useAlbums(): UseAlbumsResult {
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const { albums: libraryAlbums } = useLibrary();

    const query = useOfflineFirstQuery<AlbumBase[]>({
    queryKey: [QueryKeys.Albums, activeServer?.id],
    queryFn: api.albums.list,
    enabled: !!activeServer?.id,
    staleTime: staleTime.albums,
    fallbackData: libraryAlbums,
    hasFallbackData: hasArrayData,
  });

  return {
    albums: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
