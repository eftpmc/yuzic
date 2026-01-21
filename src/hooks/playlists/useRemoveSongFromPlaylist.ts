import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';

type RemoveSongArgs = {
  playlistId: string;
  songId: string;
};

export function useRemoveSongFromPlaylist() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playlistId, songId }: RemoveSongArgs) => {
      await api.playlists.removeSong(playlistId, songId);
    },
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.Playlist, playlistId],
      });
    },
  });
}
