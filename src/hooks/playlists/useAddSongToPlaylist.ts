import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';

type AddSongArgs = {
  playlistId: string;
  songId: string;
};

export function useAddSongToPlaylist() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playlistId, songId }: AddSongArgs) => {
      await api.playlists.addSong(playlistId, songId);
    },
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.Playlist, playlistId],
      });
    },
  });
}