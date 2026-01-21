import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { FAVORITES_ID } from '@/constants/favorites';

export function useStarSong() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (songId: string) => api.starred.add(songId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.Starred] });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.Playlist, FAVORITES_ID],
      });
    },
  });
}