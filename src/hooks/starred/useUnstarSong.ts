import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { FAVORITES_ID } from '@/constants/favorites';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useIsOffline } from '@/hooks/useIsOffline';
import { removeLibraryStarredSong } from '@/utils/redux/slices/librarySlice';
import { enqueueOfflineMutationAction } from '@/utils/redux/slices/offlineMutationsSlice';
import { createOfflineMutationId } from '@/utils/offline/offlineMutations';

export function useUnstarSong() {
  const api = useApi();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const activeServer = useSelector(selectActiveServer);
  const isOffline = useIsOffline();

  return useMutation({
    mutationFn: async (songId: string) => {
      if (isOffline) {
        if (!activeServer?.id) throw new Error('No active server.');
        dispatch(removeLibraryStarredSong(songId));
        dispatch(enqueueOfflineMutationAction({
          id: createOfflineMutationId('unstarSong', [activeServer.id, songId]),
          serverId: activeServer.id,
          type: 'unstarSong',
          songId,
          createdAt: Date.now(),
        }));
        return;
      }

      await api.starred.remove(songId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.Starred] });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.Playlist, activeServer?.id, FAVORITES_ID],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.Playlists, activeServer?.id],
      });
    },
  });
}
