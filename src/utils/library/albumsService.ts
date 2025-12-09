import { fetchAlbums } from '@/utils/navidrome/fetchAlbums';
import { fetchAlbumsFromJellyfin } from '@/utils/jellyfin/fetchAlbums';
import { RootState } from '@/utils/redux/store';
import { AlbumData } from '@/types';
import { setAlbums } from '@/utils/redux/slices/librarySlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const fetchAlbumsService = async ({
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
}) => {
  try {
    const state = getState();
    const existingAlbums = state.library.albums;
    const userPlayCounts = state.userStats.userPlayCounts;

    // ✅ Handle Jellyfin separately
    if (serverType === 'jellyfin') {
      const token = await AsyncStorage.getItem('jellyfin_token');
      if (!token) throw new Error('Missing Jellyfin token');

      const jellyfinAlbums = await fetchAlbumsFromJellyfin(serverUrl, token);
      dispatch(setAlbums(jellyfinAlbums));

      return {
        key: 'albums',
        status: 'success',
        data: jellyfinAlbums,
        meta: { fetched: jellyfinAlbums.length, total: jellyfinAlbums.length, newAlbumsFetched: true },
      };
    }

    // ✅ Navidrome flow (existing code)
    const albumListResponse = await fetch(
      `${serverUrl}/rest/getAlbumList.view?u=${encodeURIComponent(username)}&p=${encodeURIComponent(
        password
      )}&v=1.16.0&c=NavidromeApp&f=json&type=newest&size=500`
    );
    const albumListData = await albumListResponse.json();
    const serverAlbums = albumListData['subsonic-response']?.albumList?.album || [];

    const serverAlbumIds = new Set(serverAlbums.map((a: any) => a.id));
    const existingAlbumIds = new Set(existingAlbums.map((a) => a.id));

    const albumsToKeep = existingAlbums.filter((a) => serverAlbumIds.has(a.id));
    const albumsToFetch = serverAlbums.filter((a: any) => !existingAlbumIds.has(a.id));

    const newAlbumsRaw = await fetchAlbums(serverUrl, username, password, albumsToFetch);

    const newAlbums = newAlbumsRaw.map(album => {
      const updatedSongs = album.songs.map(song => ({
        ...song,
        albumId: album.id,
        subtext: `Song • ${song.artist}`,
        userPlayCount: userPlayCounts[song.id] ?? 0,
      }));

      const userPlayCount = updatedSongs.reduce((sum, s) => sum + (s.userPlayCount || 0), 0);

      return {
        ...album,
        songs: updatedSongs,
        userPlayCount,
      };
    });

    const mergedAlbums = Object.values(
      [...albumsToKeep, ...newAlbums].reduce((acc, album) => {
        acc[album.id] = album;
        return acc;
      }, {} as Record<string, AlbumData>)
    );

    dispatch(setAlbums(mergedAlbums));

    return {
      key: 'albums',
      status: 'success',
      data: mergedAlbums,
      meta: { fetched: newAlbums.length, total: mergedAlbums.length, newAlbumsFetched: newAlbums.length > 0 },
    };
  } catch (err: any) {
    return {
      key: 'albums',
      status: 'error',
      error: err?.message || 'Unknown error',
    };
  }
};