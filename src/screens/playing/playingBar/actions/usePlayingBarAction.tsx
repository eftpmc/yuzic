import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { usePlaying } from '@/contexts/PlayingContext';
import { useStarSong, useUnstarSong, useStarredSongs } from '@/hooks/starred';
import { PlayingBarAction } from '@/utils/redux/slices/settingsSlice';
import { toast } from '@backpackapp-io/react-native-toast';
import { useAlbums } from '@/hooks/albums';
import { useApi } from '@/api';

export type PlayingBarActionConfig = {
  id: PlayingBarAction;
  icon: React.ReactNode;
  onPress: () => void;
};

export function usePlayingBarAction(
  id: PlayingBarAction
): PlayingBarActionConfig | null {
  const { skipToNext, currentSong, playSongInCollection } = usePlaying();
  const { albums } = useAlbums();
  const api = useApi();

  const { songs: starredSongs } = useStarredSongs();
  const star = useStarSong();
  const unstar = useUnstarSong();

  const isFavorite =
    !!currentSong &&
    starredSongs.some(s => s.id === currentSong.id);

  switch (id) {
    case 'skip':
      return {
        id,
        icon: (
          <Ionicons
            name="play-skip-forward"
            size={20}
            color="#fff"
          />
        ),
        onPress: skipToNext,
      };

    case 'favorite':
      return {
        id,
        icon: (
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color="#fff"
          />
        ),
        onPress: async () => {
          if (!currentSong) return;

          try {
            if (isFavorite) {
              await unstar.mutateAsync(currentSong.id);
              toast.success(
                `${currentSong.title} removed from favorites.`
              );
            } else {
              await star.mutateAsync(currentSong.id);
              toast.success(
                `${currentSong.title} added to favorites.`
              );
            }
          } catch {
            toast.error('Failed to update favorites.');
          }
        },
      };

    case 'randomAlbum':
      return {
        id,
        icon: (
          <Ionicons
            name="dice-outline"
            size={20}
            color="#fff"
          />
        ),
        onPress: async () => {
          if (!albums.length) return;

          const base =
            albums[Math.floor(Math.random() * albums.length)];

          try {
            const album = await api.albums.get(base.id);

            if (!album.songs.length) return;

            playSongInCollection(album.songs[0], album, true);
            toast.success(`Playing random album: ${album.title}`);
          } catch {
            toast.error('Failed to load album.');
          }
        },
      };

    case 'none':
    default:
      return null;
  }
}