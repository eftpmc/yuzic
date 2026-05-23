import React from 'react';
import { useTranslation } from 'react-i18next';
import { SkipForward, Heart, Dices, Cast, PlusCircle } from 'lucide-react-native';
import { useCast } from '@/contexts/CastContext';
import { usePlaying } from '@/contexts/PlayingContext';
import { useStarSong, useUnstarSong, useStarredSongs } from '@/hooks/starred';
import { PlayingBarAction } from '@/utils/redux/slices/settingsSlice';
import { toast } from '@backpackapp-io/react-native-toast';
import { useAlbums } from '@/hooks/albums';
import { useApi } from '@/api';
import { useIsOffline } from '@/hooks/useIsOffline';

export type PlayingBarActionConfig = {
  id: PlayingBarAction;
  icon: React.ReactNode;
  onPress: () => void;
};

type UsePlayingBarActionOptions = {
  presentAddToPlaylist?: () => void;
  presentCast?: () => void;
};

export function usePlayingBarAction(
  id: PlayingBarAction,
  options?: UsePlayingBarActionOptions
): PlayingBarActionConfig | null {
  const { t } = useTranslation();
  const { skipToNext, currentSong, playSongInCollection } = usePlaying();
  const { albums } = useAlbums();
  const api = useApi();
  const isOffline = useIsOffline();

  const { songs: starredSongs } = useStarredSongs();
  const star = useStarSong();
  const unstar = useUnstarSong();

  const { activeDevice, isGoogleCastConnected } = useCast();
  const isCasting = activeDevice != null || isGoogleCastConnected;

  const isFavorite =
    !!currentSong &&
    starredSongs.some(s => s.id === currentSong.id);

  switch (id) {
    case 'skip':
      return {
        id,
        icon: <SkipForward size={20} color="#fff" />,
        onPress: skipToNext,
      };

    case 'favorite':
      return {
        id,
        icon: <Heart size={20} color="#fff" fill={isFavorite ? '#fff' : 'none'} />,
        onPress: async () => {
          if (!currentSong) return;

          try {
            if (isFavorite) {
              await unstar.mutateAsync(currentSong.id);
              toast.success(
                t(
                  isOffline
                    ? 'playing.actions.removedFromFavoritesOffline'
                    : 'playing.actions.removedFromFavorites',
                  { title: currentSong.title }
                )
              );
            } else {
              await star.mutateAsync(currentSong);
              toast.success(
                t(
                  isOffline
                    ? 'playing.actions.addedToFavoritesOffline'
                    : 'playing.actions.addedToFavorites',
                  { title: currentSong.title }
                )
              );
            }
          } catch {
            toast.error(t('playing.actions.updateFavoritesFailed'));
          }
        },
      };

    case 'randomAlbum':
      return {
        id,
        icon: <Dices size={20} color="#fff" />,
        onPress: async () => {
          if (!albums.length) return;
          if (isOffline) {
            toast.error(t('common.offline.notAvailable'));
            return;
          }

          const base =
            albums[Math.floor(Math.random() * albums.length)];

          try {
            const album = await api.albums.get(base.id);

            if (!album.songs.length) return;

            playSongInCollection(album.songs[0], album, true);
            toast.success(t('playing.actions.randomAlbum', { title: album.title }));
          } catch {
            toast.error(t('playing.actions.loadAlbumFailed'));
          }
        },
      };

    case 'addToPlaylist':
      return {
        id,
        icon: <PlusCircle size={20} color="#fff" />,
        onPress: options?.presentAddToPlaylist ?? (() => {}),
      };

    case 'cast':
      return {
        id,
        icon: <Cast size={20} color={isCasting ? '#fff' : '#fff'} />,
        onPress: options?.presentCast ?? (() => {}),
      };

    case 'none':
    default:
      return null;
  }
}
