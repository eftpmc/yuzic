import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/enums/queryKeys';
import { Song } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';

type UseStarredSongsResult = {
  songs: Song[];
  isLoading: boolean;
  error: Error | null;
};

export function useStarredSongs(): UseStarredSongsResult {
  const api = useApi();

  const query = useQuery<{ songs: Song[] }, Error>({
    queryKey: [QueryKeys.Starred],
    queryFn: api.starred.list,
    staleTime: staleTime.starred,
  });

  return {
    songs: query.data?.songs ?? [],
    isLoading: query.isLoading,
    error: query.error ?? null,
  };
}