import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/enums/queryKeys';
import { Playlist } from '@/types';
import { useApi } from '@/api';

type UsePlaylistResult = {
  playlist: Playlist | null;
  isLoading: boolean;
  error: Error | null;
};

export function usePlaylist(id: string): UsePlaylistResult {
  const api = useApi();

  const query = useQuery<Playlist, Error>({
    queryKey: [QueryKeys.Playlist, id],
    queryFn: () => api.playlists.get(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  return {
    playlist: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ?? null,
  };
}