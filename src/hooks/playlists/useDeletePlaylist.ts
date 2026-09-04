import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { PlaylistBase } from '@/types';
import { useIsOffline } from '@/hooks/useIsOffline';
import { removeLibraryPlaylist } from '@/utils/redux/slices/librarySlice';
import { enqueueOfflineMutationAction } from '@/utils/redux/slices/offlineMutationsSlice';
import { createOfflineMutationId } from '@/utils/offline/offlineMutations';

export function useDeletePlaylist() {
  const api = useApi();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const activeServer = useSelector(selectActiveServer);
  const isOffline = useIsOffline();

  return useMutation({
    mutationFn: async (playlistId: string) => {
      if (isOffline) {
        if (!activeServer?.id) throw new Error('No active server.');
        dispatch(removeLibraryPlaylist(playlistId));
        dispatch(enqueueOfflineMutationAction({
          id: createOfflineMutationId('deletePlaylist', [activeServer.id, playlistId]),
          serverId: activeServer.id,
          type: 'deletePlaylist',
          playlistId,
          createdAt: Date.now(),
        }));
        return;
      }
      await api.playlists.delete(playlistId);
    },
    onSuccess: (_, playlistId) => {
      // Patch the list cache directly instead of relying solely on
      // invalidation — invalidateQueries alone does nothing observable while
      // offline (the query stays disabled until reconnect), so a deletion
      // while offline left the playlist visibly still in the list.
      queryClient.setQueryData<PlaylistBase[] | undefined>(
        [QueryKeys.Playlists, activeServer?.id],
        (old) => old?.filter(p => p.id !== playlistId)
      );
      queryClient.invalidateQueries({ queryKey: [QueryKeys.Playlists, activeServer?.id] });
      queryClient.removeQueries({
        queryKey: [QueryKeys.Playlist, activeServer?.id, playlistId],
      });
    },
  });
}
