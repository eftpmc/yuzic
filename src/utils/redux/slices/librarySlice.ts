import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Song } from '@/types';

// Post-split shell. Genres stay here — the payload is tiny (a
// Record<serverId, string[]>) and keeping it in its own slice would create
// yet another persist key for no gain. Everything else moved to per-collection
// slices so their large payloads rehydrate in parallel without one blocking
// another.
//
// The addLibraryPlaylistSong / removeLibraryPlaylistSong / renameLibraryPlaylist
// / removeLibraryPlaylist / clearLibrary re-exports are gone from this file;
// callers now import from libraryPlaylistsSlice. clearLibrary is dispatched
// as a fan-out at the callsite (server switch + disconnect).

interface LibraryState {
  genres: Record<string, string[]>;
}

const initialState: LibraryState = {
  genres: {},
};

const librarySlice = createSlice({
  name: 'library',
  initialState,
  reducers: {
    setLibraryGenres(state, action: PayloadAction<{ serverId: string; genres: string[] }>) {
      state.genres[action.payload.serverId] = action.payload.genres;
    },
    clearLibraryGenres(state) {
      state.genres = {};
    },
  },
});

export const {
  setLibraryGenres,
  clearLibraryGenres,
} = librarySlice.actions;

/**
 * `clearLibrary` is the fan-out helper for "we changed servers, drop
 * everything server-scoped". Not a thunk — takes `dispatch` directly so
 * callers use the plain, untyped `useDispatch()` without needing a
 * ThunkDispatch-aware AppDispatch. Kept exported from this module so no
 * callsite needs to know about the split.
 */
import { clearLibraryAlbums } from './libraryAlbumsSlice';
import { clearLibraryArtists } from './libraryArtistsSlice';
import { clearLibraryPlaylists } from './libraryPlaylistsSlice';
import { clearLibraryTracks } from './libraryTracksSlice';
export const clearLibrary = (dispatch: (action: any) => void) => {
  dispatch(clearLibraryAlbums());
  dispatch(clearLibraryArtists());
  dispatch(clearLibraryPlaylists());
  dispatch(clearLibraryTracks());
  dispatch(clearLibraryGenres());
};

/**
 * Kept for the existing SongOptions / PlaylistOptions call surface. Each
 * action delegates to the per-collection slice; the shim is small and lets
 * consumers not care about which slice owns which reducer.
 */
export {
  setLibraryAlbums,
  clearLibraryAlbums,
} from './libraryAlbumsSlice';
export {
  setLibraryArtists,
  clearLibraryArtists,
} from './libraryArtistsSlice';
export {
  setLibraryPlaylists,
  addLibraryPlaylistSong,
  removeLibraryPlaylistSong,
  renameLibraryPlaylist,
  removeLibraryPlaylist,
  clearLibraryPlaylists,
} from './libraryPlaylistsSlice';
export {
  setLibraryTracks,
  clearLibraryTracks,
} from './libraryTracksSlice';

// Type shim: some code (Song type import) still references this file.
export type { Song };

export default librarySlice.reducer;
