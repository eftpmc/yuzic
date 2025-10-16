import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchGenreMaps } from '@/utils/navidrome/fetchGenres';
import { fetchJellyfinGenreMaps } from '@/utils/jellyfin/fetchGenres';
import { RootState } from '@/utils/redux/store';
import { GenreMaps } from '@/types';
import { setGenreMaps } from '@/utils/redux/slices/genreSlice';
import { setServiceStatus } from '@/utils/redux/slices/libraryStatusSlice';
import { updateAlbumsWithGenres } from '@/utils/library/updateAlbumsWithGenres';
import { setAlbums } from '@/utils/redux/slices/librarySlice';

const API_VERSION = '1.16.0';
const CLIENT_NAME = 'NavidromeApp';

export const fetchGenresService = async ({
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
  key: 'genres';
  status: 'success' | 'error';
  data?: GenreMaps;
  meta?: { fetched: number; total: number };
  error?: string;
}> => {
  try {
    const state = getState();
    const existingGenreMaps = state.genre;
    const fetchedGenreNames = new Set(existingGenreMaps.fetchedGenres.map((g) => g.toLowerCase()));

    let allGenres: string[] = [];
    let token: string | null = null;

    // ✅ Step 1 — Handle per-server auth
    if (serverType === 'jellyfin') {
      token = await AsyncStorage.getItem('jellyfin_token');
      if (!token) throw new Error('Missing Jellyfin token — please log in again.');

      const res = await fetch(`${serverUrl}/Genres`, {
        headers: { 'X-Emby-Token': token },
      });

      if (!res.ok) throw new Error(`Failed to fetch Jellyfin genres (${res.status})`);

      const data = await res.json();
      allGenres = data.Items?.map((g: any) => g.Name) || [];
    } else {
      const genreResponse = await fetch(
        `${serverUrl}/rest/getGenres.view?u=${encodeURIComponent(username)}&p=${encodeURIComponent(
          password
        )}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json`
      );

      if (!genreResponse.ok) throw new Error(`Failed to fetch Navidrome genres (${genreResponse.status})`);

      const genreData = await genreResponse.json();
      allGenres =
        genreData['subsonic-response']?.genres?.genre?.map((g: { value: string }) => g.value) || [];
    }

    // ✅ Step 2 — Determine new genres
    const newGenres = allGenres.filter((g) => !fetchedGenreNames.has(g.toLowerCase()));

    let fullGenreMaps: GenreMaps;

    // ✅ Step 3 — Fetch details
    if (newGenres.length === 0) {
      console.log(`[${serverType}] No new genres to fetch.`);
      fullGenreMaps = existingGenreMaps;
    } else {
      const updatedGenreMaps =
        serverType === 'jellyfin'
          ? await fetchJellyfinGenreMaps(serverUrl, token!, existingGenreMaps, newGenres)
          : await fetchGenreMaps(serverUrl, username, password, existingGenreMaps, newGenres);

      fullGenreMaps = {
        ...updatedGenreMaps,
        fetchedGenres: Array.from(
          new Set([
            ...existingGenreMaps.fetchedGenres.map((g) => g.toLowerCase()),
            ...newGenres.map((g) => g.toLowerCase()),
          ])
        ),
      };

      dispatch(setGenreMaps(fullGenreMaps));
    }

    // ✅ Step 4 — Update album genre tags
    const existingAlbums = getState().library.albums;
    const enrichedAlbums = updateAlbumsWithGenres(existingAlbums, fullGenreMaps);
    dispatch(setAlbums(enrichedAlbums));

    dispatch(
      setServiceStatus({
        key: 'genres',
        status: 'success',
        meta: { fetched: newGenres.length, total: allGenres.length },
      })
    );

    return {
      key: 'genres',
      status: 'success',
      data: fullGenreMaps,
      meta: { fetched: newGenres.length, total: allGenres.length },
    };
  } catch (err: any) {
    console.error('[LibraryService:Genres] Error:', err);
    return {
      key: 'genres',
      status: 'error',
      error: err?.message || 'Failed to fetch genres',
    };
  }
};