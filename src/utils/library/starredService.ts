import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStarredItemIds } from '@/utils/navidrome/starApi';
import { getStarredItemIdsJellyfin } from '@/utils/jellyfin/starApi';
import { RootState } from '@/utils/redux/store';
import { setStarred } from '@/utils/redux/slices/librarySlice';

export const fetchStarredService = async ({
  serverType,
  serverUrl,
  username,
  password,
  getState,
  dispatch,
}: {
  serverType: string;
  serverUrl: string;
  username: string;
  password: string;
  getState: () => RootState;
  dispatch: any;
}): Promise<{
  key: 'starred';
  status: 'success' | 'error';
  data?: {
    albumIds: string[];
    artistIds: string[];
    songIds: string[];
  };
  meta?: { total: number };
  error?: string;
}> => {
  try {
    let starred: { albumIds: string[]; artistIds: string[]; songIds: string[] };

    if (serverType === 'jellyfin') {
      const token = await AsyncStorage.getItem('jellyfin_token');
      const userId = await AsyncStorage.getItem('jellyfin_userId');
      if (!token || !userId) throw new Error('Missing Jellyfin authentication');
      starred = await getStarredItemIdsJellyfin(serverUrl, userId, token);
    } else {
      starred = await getStarredItemIds(serverUrl, username, password);
    }

    const state = getState();
    const albums = state.library.albums;
    const artists = state.library.artists;

    const starredAlbums = albums.filter((a) => starred.albumIds.includes(a.id));
    const starredArtists = artists.filter((a) => starred.artistIds.includes(a.id));
    const starredSongs = albums
      .flatMap((a) => a.songs)
      .filter((s) => starred.songIds.includes(s.id));

    dispatch(
      setStarred({
        albums: starredAlbums,
        artists: starredArtists,
        songs: starredSongs,
      })
    );

    return {
      key: 'starred',
      status: 'success',
      data: starred,
      meta: {
        total:
          starred.albumIds.length +
          starred.artistIds.length +
          starred.songIds.length,
      },
    };
  } catch (err: any) {
    console.error('[LibraryService:Starred] Error:', err);
    return {
      key: 'starred',
      status: 'error',
      error: err?.message || 'Failed to fetch starred IDs',
    };
  }
};