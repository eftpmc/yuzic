import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type DownloaderId = 'lidarr' | 'slskd';

export const DOWNLOADER_IDS: DownloaderId[] = ['lidarr', 'slskd'];

export interface DownloaderConnection {
  serverUrl: string;
  apiKey: string;
  isAuthenticated: boolean;
}

export type PerServerDownloadersState = Record<DownloaderId, DownloaderConnection>;

export interface DownloadersState {
  byServer: Record<string, PerServerDownloadersState>;
}

const emptyConnection: DownloaderConnection = {
  serverUrl: '',
  apiKey: '',
  isAuthenticated: false,
};

const defaultPerServer: PerServerDownloadersState = {
  lidarr: emptyConnection,
  slskd: emptyConnection,
};

const initialState: DownloadersState = {
  byServer: {},
};

function getOrCreate(state: DownloadersState, serverId: string, downloader: DownloaderId): DownloaderConnection {
  if (!state.byServer[serverId]) {
    state.byServer[serverId] = JSON.parse(JSON.stringify(defaultPerServer));
  }
  // Entries persisted before a downloader existed won't have its key yet.
  if (!state.byServer[serverId][downloader]) {
    state.byServer[serverId][downloader] = { ...emptyConnection };
  }
  return state.byServer[serverId][downloader];
}

type DownloaderRef = { serverId: string; downloader: DownloaderId };

const downloadersSlice = createSlice({
  name: 'downloaders',
  initialState,
  reducers: {
    setDownloaderServerUrl(state, action: PayloadAction<DownloaderRef & { value: string }>) {
      const entry = getOrCreate(state, action.payload.serverId, action.payload.downloader);
      entry.serverUrl = action.payload.value;
    },
    setDownloaderApiKey(state, action: PayloadAction<DownloaderRef & { value: string }>) {
      const entry = getOrCreate(state, action.payload.serverId, action.payload.downloader);
      entry.apiKey = action.payload.value;
    },
    setDownloaderAuthenticated(state, action: PayloadAction<DownloaderRef & { value: boolean }>) {
      const entry = getOrCreate(state, action.payload.serverId, action.payload.downloader);
      entry.isAuthenticated = action.payload.value;
    },
    connectDownloader(state, action: PayloadAction<DownloaderRef>) {
      const entry = getOrCreate(state, action.payload.serverId, action.payload.downloader);
      entry.isAuthenticated = true;
    },
    disconnectDownloader(state, action: PayloadAction<DownloaderRef>) {
      const entry = getOrCreate(state, action.payload.serverId, action.payload.downloader);
      entry.serverUrl = '';
      entry.apiKey = '';
      entry.isAuthenticated = false;
    },
  },
});

export const {
  setDownloaderServerUrl,
  setDownloaderApiKey,
  setDownloaderAuthenticated,
  connectDownloader,
  disconnectDownloader,
} = downloadersSlice.actions;

export default downloadersSlice.reducer;
