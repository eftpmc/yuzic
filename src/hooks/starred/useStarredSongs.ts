import { useSelector } from 'react-redux';
import { QueryKeys } from '@/enums/queryKeys';
import { Song } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useLibrary } from '@/contexts/LibraryContext';
import { hasArrayData, useOfflineFirstQuery } from '@/hooks/useOfflineFirstQuery';

type UseStarredSongsResult = {
  songs: Song[];
  isLoading: boolean;
  error: Error | null;
};

export function useStarredSongs(): UseStarredSongsResult {
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const { starred: libraryStarred } = useLibrary();

  const query = useOfflineFirstQuery<{ songs: Song[] }>({
    queryKey: [QueryKeys.Starred, activeServer?.id],
    queryFn: api.starred.list,
    enabled: !!activeServer?.id,
    staleTime: staleTime.starred,
    fallbackData: { songs: libraryStarred },
    hasFallbackData: value => hasArrayData(value.songs),
  });

  return {
    songs: query.data.songs,
    isLoading: query.isLoading,
    error: query.error,
  };
}
