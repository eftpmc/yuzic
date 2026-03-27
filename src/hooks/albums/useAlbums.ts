import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { QueryKeys } from '@/enums/queryKeys';
import { Album } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useLibrary } from '@/contexts/LibraryContext';

type UseAlbumsResult = {
  albums: Album[];
  isLoading: boolean;
  error: Error | null;
};

export function useAlbums(): UseAlbumsResult {
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const { albums: libraryAlbums } = useLibrary();

  const query = useQuery<Album[], Error>({
    queryKey: [QueryKeys.Albums, activeServer?.id],
    queryFn: api.albums.list,
    enabled: !!activeServer?.id,
    staleTime: staleTime.albums,
  });

  return {
    albums: query.data ?? libraryAlbums,
    isLoading: query.isLoading && libraryAlbums.length === 0,
    error: query.error ?? null,
  };
}
