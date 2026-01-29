import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type DownloaderType = 'lidarr' | 'slskd';

export interface LidarrConfig {
  serverUrl: string;
  apiKey: string;
  isAuthenticated: boolean;
}

export interface SlskdConfig {
  serverUrl: string;
  apiKey: string;
  isAuthenticated: boolean;
}

export interface DownloadersState {
  activeDownloader: DownloaderType | null;
  lidarr: LidarrConfig;
  slskd: SlskdConfig;
}

const initialState: DownloadersState = {
  activeDownloader: null,
  lidarr: {
    serverUrl: '',
    apiKey: '',
    isAuthenticated: false,
  },
  slskd: {
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
    setSlskdServerUrl(state, action: PayloadAction<string>) {
      state.slskd.serverUrl = action.payload;
    },
    setSlskdApiKey(state, action: PayloadAction<string>) {
      state.slskd.apiKey = action.payload;
    },
    setSlskdAuthenticated(state, action: PayloadAction<boolean>) {
      state.slskd.isAuthenticated = action.payload;
    },
    connectSlskd(state) {
      state.slskd.isAuthenticated = true;
      state.activeDownloader = 'slskd';
    },
    disconnectSlskd(state) {
      state.slskd.serverUrl = '';
      state.slskd.apiKey = '';
      state.slskd.isAuthenticated = false;
      state.activeDownloader = state.activeDownloader === 'slskd' ? null : state.activeDownloader;
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
  setSlskdServerUrl,
  setSlskdApiKey,
  setSlskdAuthenticated,
  connectSlskd,
  disconnectSlskd,
} = downloadersSlice.actions;

export default downloadersSlice.reducer;
