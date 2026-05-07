import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { Playlist, Song } from '@/types';
import { selectSongsById } from '@/utils/redux/selectors/librarySelectors';
import { useIsOffline } from '@/hooks/useIsOffline';
import { addLibraryPlaylistSong } from '@/utils/redux/slices/librarySlice';
import { enqueueOfflineMutationAction } from '@/utils/redux/slices/offlineMutationsSlice';
import { createOfflineMutationId } from '@/utils/offline/offlineMutations';

type AddSongArgs = {
  playlistId: string;
  songId?: string;
  song?: Song;
};

export function useAddSongToPlaylist() {
  const api = useApi();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const activeServer = useSelector(selectActiveServer);
  const songsById = useSelector(selectSongsById);
  const isOffline = useIsOffline();

  return useMutation({
    mutationFn: async ({ playlistId, songId, song: inputSong }: AddSongArgs) => {
      const resolvedSongId = songId ?? inputSong?.id;
      if (!resolvedSongId) throw new Error('Missing song id.');
      const song = inputSong ?? songsById.get(resolvedSongId);

      if (isOffline) {
        if (!activeServer?.id || !song) throw new Error('Song is not available offline.');
        dispatch(addLibraryPlaylistSong({ playlistId, song }));
        dispatch(enqueueOfflineMutationAction({
          id: createOfflineMutationId('addSongToPlaylist', [activeServer.id, playlistId, song.id]),
          serverId: activeServer.id,
          type: 'addSongToPlaylist',
          playlistId,
          song,
          createdAt: Date.now(),
        }));
        return;
      }

      await api.playlists.addSong(playlistId, resolvedSongId);
    },
    onSuccess: (_, { playlistId, songId, song: inputSong }) => {
      const resolvedSongId = songId ?? inputSong?.id;
      const song = inputSong ?? (resolvedSongId ? songsById.get(resolvedSongId) : undefined);

      if (song) {
        const addToCache = (old: Playlist | null | undefined): Playlist | null | undefined => {
          if (!old) return old;
          if (old.songs.some(s => s.id === song.id)) return old;
          return { ...old, songs: [...old.songs, song] };
        };

        queryClient.setQueryData<Playlist | null>(
          [QueryKeys.Playlist, activeServer?.id, playlistId],
          addToCache
        );
        queryClient.setQueryData<Playlist[]>(
          [QueryKeys.Playlists, activeServer?.id],
          old => old?.map(p => p.id === playlistId ? (addToCache(p) ?? p) : p)
        );
        dispatch(addLibraryPlaylistSong({ playlistId, song }));
      } else {
        // No song object available — fall back to invalidation so UI stays correct
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.Playlist, activeServer?.id, playlistId],
        });
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.Playlists, activeServer?.id],
        });
      }
    },
  });
}
