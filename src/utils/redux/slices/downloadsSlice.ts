import { createSlice } from '@reduxjs/toolkit';

/**
 * Legacy downloads slice - kept as a stub for redux-persist compatibility.
 * Download state is now managed natively by react-native-nitro-player's DownloadManager.
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
