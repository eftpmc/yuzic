import { FAVORITES_ID } from '@/constants/favorites';
import { Playlist, Song } from '@/types';

export function buildFavoritesPlaylist(songs: Song[]): Playlist {
  return {
    id: FAVORITES_ID,
    title: 'Favorites',
    cover: {
      kind: 'special',
      name: 'heart',
    },
    subtext: `Playlist • ${songs.length} songs`,
    songs,
  };
}