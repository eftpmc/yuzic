import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';

export function useDeletePlaylist() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playlistId: string) => {
      await api.playlists.delete(playlistId);
    },
    onSuccess: (_, playlistId) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.Playlists] });
      queryClient.removeQueries({ queryKey: [QueryKeys.Playlist, playlistId] });
    },
  });
}
