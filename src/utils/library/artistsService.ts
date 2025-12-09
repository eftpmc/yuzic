import { fetchArtists } from '@/utils/navidrome/fetchArtists';
import { fetchArtistsFromJellyfin } from '@/utils/jellyfin/fetchArtists';
import { RootState } from '@/utils/redux/store';
import { ArtistData } from '@/types';
import { setArtists } from '@/utils/redux/slices/librarySlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const fetchArtistsService = async ({
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
  key: 'artists';
  status: 'success' | 'error';
  data?: ArtistData[];
  meta?: { fetched: number; total: number };
  error?: string;
}> => {
  try {
    const state = getState();

    // 🧠 Existing cached artists and downloaded albums
    const existingArtists = state.library.artists ?? [];
    const existingAlbums = (state.library.albums ?? []).map((album) => ({
      id: album.id,
      cover: album.cover,
      title: album.title,
      subtext: album.subtext,
      artist: album.artist.name,
    }));

    let newArtists: ArtistData[] = [];

    if (serverType === 'jellyfin') {
      // ✅ safely pull token from AsyncStorage
      const token = await AsyncStorage.getItem('jellyfin_token');
      if (!token) throw new Error('Missing Jellyfin token — please log in again.');

      // ✅ Pass existing albums + artists for proper matching
      newArtists = await fetchArtistsFromJellyfin(
        serverUrl,
        token,
        existingAlbums, // downloaded albums
        existingArtists // cache reuse
      );
    } else {
      newArtists = await fetchArtists(
        serverUrl,
        username,
        password,
        existingAlbums,
        existingArtists
      );
    }

    // Filter new ones for meta
    const existingIds = new Set(existingArtists.map((a) => a.id));
    const fetched = newArtists.filter((a) => !existingIds.has(a.id)).length;

    // ✅ Update store
    dispatch(setArtists(newArtists));

    return {
      key: 'artists',
      status: 'success',
      data: newArtists,
      meta: { fetched, total: newArtists.length },
    };
  } catch (err: any) {
    console.error('[LibraryService:Artists] Error:', err);
    return {
      key: 'artists',
      status: 'error',
      error: err?.message || 'Failed to fetch artists',
    };
  }
};