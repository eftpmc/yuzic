import { createSlice } from '@reduxjs/toolkit';

/**
 * Legacy downloads slice - kept as a stub for redux-persist compatibility.
 */
export interface DownloadsState {
  markedAlbums: string[];
  markedPlaylists: string[];
}

const initialState: DownloadsState = {
  markedAlbums: [],
  markedPlaylists: [],
};

const downloadsSlice = createSlice({
  name: 'downloads',
  initialState,
  reducers: {},
});

export default downloadsSlice.reducer;
