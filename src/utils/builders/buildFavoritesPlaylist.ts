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
    subtext: `Playlist • Custom`,
    changed: new Date("1995-12-17T03:24:00"),
    created: new Date("1995-12-17T03:24:00"),
    songs,
  };
}