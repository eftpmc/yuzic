import { useMemo } from 'react';
import { useStarredSongs } from '@/hooks/starred/useStarredSongs';
import { buildFavoritesPlaylist } from '@/utils/builders/buildFavoritesPlaylist';
import { Playlist } from '@/types';

type UseFavoritesPlaylistResult = {
  playlist: Playlist;
  isLoading: boolean;
};

export function useFavoritesPlaylist(): UseFavoritesPlaylistResult {
  const { songs, isLoading } = useStarredSongs();

  const playlist = useMemo(
    () => buildFavoritesPlaylist(songs),
    [songs]
  );

  return {
    playlist,
    isLoading,
  };
}