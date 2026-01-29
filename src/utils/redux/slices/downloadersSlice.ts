import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type DownloaderType = 'lidarr';

export interface LidarrConfig {
  serverUrl: string;
  apiKey: string;
  isAuthenticated: boolean;
}

export interface DownloadersState {
  activeDownloader: DownloaderType | null;
  lidarr: LidarrConfig;
}

const initialState: DownloadersState = {
  activeDownloader: null,
  lidarr: {
    serverUrl: '',
    apiKey: '',
    isAuthenticated: false,
  },
};

const downloadersSlice = createSlice({
  name: 'downloaders',
  initialState,
  reducers: {
    setActiveDownloader(state, action: PayloadAction<DownloaderType | null>) {
      state.activeDownloader = action.payload;
    },
    setLidarrServerUrl(state, action: PayloadAction<string>) {
      state.lidarr.serverUrl = action.payload;
    },
    setLidarrApiKey(state, action: PayloadAction<string>) {
      state.lidarr.apiKey = action.payload;
    },
    setLidarrAuthenticated(state, action: PayloadAction<boolean>) {
      state.lidarr.isAuthenticated = action.payload;
    },
    connectLidarr(state) {
      state.lidarr.isAuthenticated = true;
      state.activeDownloader = 'lidarr';
    },
    disconnectLidarr(state) {
      state.lidarr.serverUrl = '';
      state.lidarr.apiKey = '';
      state.lidarr.isAuthenticated = false;
      state.activeDownloader = state.activeDownloader === 'lidarr' ? null : state.activeDownloader;
    },
  },
});

export const {
  setActiveDownloader,
  setLidarrServerUrl,
  setLidarrApiKey,
  setLidarrAuthenticated,
  connectLidarr,
  disconnectLidarr,
} = downloadersSlice.actions;

export default downloadersSlice.reducer;
