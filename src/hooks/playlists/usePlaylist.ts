import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/enums/queryKeys';
import { Playlist } from '@/types';
import { useApi } from '@/api';
import { staleTime } from '@/constants/staleTime';

type UsePlaylistResult = {
  playlist: Playlist | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  isRefetching: boolean;
};

export function usePlaylist(id: string): UsePlaylistResult {
  const api = useApi();

  const query = useQuery<Playlist, Error>({
    queryKey: [QueryKeys.Playlist, id],
    queryFn: () => api.playlists.get(id),
    enabled: !!id,
    staleTime: staleTime.playlists,
    refetchOnMount: true,
  });

  return {
    playlist: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ?? null,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}