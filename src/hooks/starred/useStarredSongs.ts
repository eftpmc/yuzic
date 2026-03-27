import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { QueryKeys } from '@/enums/queryKeys';
import { Song } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useLibrary } from '@/contexts/LibraryContext';

type UseStarredSongsResult = {
  songs: Song[];
  isLoading: boolean;
  error: Error | null;
};

export function useStarredSongs(): UseStarredSongsResult {
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const { starred: libraryStarred } = useLibrary();

  const query = useQuery<{ songs: Song[] }, Error>({
    queryKey: [QueryKeys.Starred, activeServer?.id],
    queryFn: api.starred.list,
    enabled: !!activeServer?.id,
    staleTime: staleTime.starred,
  });

  return {
    songs: query.data?.songs ?? libraryStarred,
    isLoading: query.isLoading && libraryStarred.length === 0,
    error: query.error ?? null,
  };
}
