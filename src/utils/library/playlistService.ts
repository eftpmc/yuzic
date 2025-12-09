import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPlaylists as fetchNavidromePlaylists } from '@/utils/navidrome/playlistApi';
import { fetchPlaylists as fetchJellyfinPlaylists } from '@/utils/jellyfin/playlistApi';
import { RootState } from '@/utils/redux/store';
import { setPlaylists } from '@/utils/redux/slices/librarySlice';
import { PlaylistData, SongData } from '@/types';
import { setServiceStatus } from '@/utils/redux/slices/libraryStatusSlice';

export const fetchPlaylistsService = async ({
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
  key: 'playlists';
  status: 'success' | 'error';
  data?: PlaylistData[];
  meta?: { fetched: number; total: number };
  error?: string;
}> => {
  try {
    const state = getState();
    const allSongs = state.library.albums.flatMap(a => a.songs);
    const starredSongs = state.library.starred.songs;
    const previousIds = new Set(state.library.playlists.filter(p => p.id !== 'favorite').map(p => p.id));

    let rawPlaylists: { id: string; name: string; entryIds: string[] }[] = [];

    // --- 🔀 Switch between Navidrome and Jellyfin ---
    if (serverType === 'navidrome') {
      rawPlaylists = await fetchNavidromePlaylists(serverUrl, username, password);
    } else if (serverType === 'jellyfin') {
      // ✅ Retrieve the Jellyfin token from AsyncStorage
      const token = await AsyncStorage.getItem('jellyfin_token');
      const userId = await AsyncStorage.getItem('jellyfin_userId');

      if (!token || !userId) {
        throw new Error('Missing Jellyfin authentication — please reconnect your server.');
      }

      rawPlaylists = await fetchJellyfinPlaylists(serverUrl, userId, token);
    } else {
      throw new Error(`Unsupported server type: ${serverType}`);
    }

    // --- 🧠 Map into unified PlaylistData format ---
    const newPlaylistsRaw = rawPlaylists.filter(p => !previousIds.has(p.id));

    const serverPlaylists: PlaylistData[] = rawPlaylists.map(p => {
      const songs = p.entryIds
        .map(id => allSongs.find(s => s.id === id))
        .filter((s): s is SongData => Boolean(s));

      const cover = songs[0]?.cover || '';

      return {
        id: p.id,
        title: p.name,
        subtext:
          serverType === 'jellyfin'
            ? `Playlist • Jellyfin`
            : `Playlist • ${username}`,
        cover,
        songs,
      };
    });

    const favoritePlaylist: PlaylistData = {
      id: 'favorite',
      cover: 'heart-icon',
      title: 'Favorites',
      subtext: `Playlist • ${starredSongs.length} songs`,
      songs: starredSongs,
    };

    const fullPlaylistList = [favoritePlaylist, ...serverPlaylists];

    // --- 🧩 Update Redux ---
    dispatch(setPlaylists(fullPlaylistList));

    dispatch(
      setServiceStatus({
        key: 'playlists',
        status: 'success',
        meta: {
          fetched: newPlaylistsRaw.length,
          total: fullPlaylistList.length,
        },
      })
    );

    return {
      key: 'playlists',
      status: 'success',
      data: fullPlaylistList,
      meta: {
        fetched: newPlaylistsRaw.length,
        total: fullPlaylistList.length,
      },
    };
  } catch (err: any) {
    console.error('[LibraryService:Playlists] Error:', err);
    return {
      key: 'playlists',
      status: 'error',
      error: err?.message || 'Failed to fetch playlists',
    };
  }
};