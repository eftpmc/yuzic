import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { FAVORITES_ID } from '@/constants/favorites';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { Song } from '@/types';
import { useIsOffline } from '@/hooks/useIsOffline';
import { usePlayableSongResolver } from '@/hooks/songs';
import { addLibraryStarredSong } from '@/utils/redux/slices/librarySlice';
import { enqueueOfflineMutationAction } from '@/utils/redux/slices/offlineMutationsSlice';
import { createOfflineMutationId } from '@/utils/offline/offlineMutations';

type StarSongInput = string | Song;

export function useStarSong() {
  const api = useApi();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const activeServer = useSelector(selectActiveServer);
  const isOffline = useIsOffline();
  const { resolvePlayableSong } = usePlayableSongResolver();

  return useMutation({
    mutationFn: async (input: StarSongInput) => {
      const songId = typeof input === 'string' ? input : input.id;
      const song = await resolvePlayableSong(input, { allowNetwork: !isOffline });

      if (isOffline) {
        if (!activeServer?.id || !song) throw new Error('Song is not available offline.');
        dispatch(addLibraryStarredSong(song));
        dispatch(enqueueOfflineMutationAction({
          id: createOfflineMutationId('starSong', [activeServer.id, song.id]),
          serverId: activeServer.id,
          type: 'starSong',
          song,
          createdAt: Date.now(),
        }));
        return;
      }

      await api.starred.add(songId);
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
