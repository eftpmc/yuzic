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

export interface PerServerDownloadersState {
  activeDownloader: DownloaderType | null;
  lidarr: LidarrConfig;
  slskd: SlskdConfig;
}

export interface DownloadersState {
  byServer: Record<string, PerServerDownloadersState>;
}

const defaultPerServer: PerServerDownloadersState = {
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

const initialState: DownloadersState = {
  byServer: {},
};

function getOrCreate(state: DownloadersState, serverId: string): PerServerDownloadersState {
  if (!state.byServer[serverId]) {
    state.byServer[serverId] = JSON.parse(JSON.stringify(defaultPerServer));
  }
  return state.byServer[serverId];
}

const downloadersSlice = createSlice({
  name: 'downloaders',
  initialState,
  reducers: {
    setActiveDownloader(state, action: PayloadAction<{ serverId: string; value: DownloaderType | null }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.activeDownloader = action.payload.value;
    },
    setLidarrServerUrl(state, action: PayloadAction<{ serverId: string; value: string }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.lidarr.serverUrl = action.payload.value;
    },
    setLidarrApiKey(state, action: PayloadAction<{ serverId: string; value: string }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.lidarr.apiKey = action.payload.value;
    },
    setLidarrAuthenticated(state, action: PayloadAction<{ serverId: string; value: boolean }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.lidarr.isAuthenticated = action.payload.value;
    },
    connectLidarr(state, action: PayloadAction<{ serverId: string }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.lidarr.isAuthenticated = true;
      entry.activeDownloader = 'lidarr';
    },
    disconnectLidarr(state, action: PayloadAction<{ serverId: string }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.lidarr.serverUrl = '';
      entry.lidarr.apiKey = '';
      entry.lidarr.isAuthenticated = false;
      entry.activeDownloader = entry.activeDownloader === 'lidarr' ? null : entry.activeDownloader;
    },
    setSlskdServerUrl(state, action: PayloadAction<{ serverId: string; value: string }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.slskd.serverUrl = action.payload.value;
    },
    setSlskdApiKey(state, action: PayloadAction<{ serverId: string; value: string }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.slskd.apiKey = action.payload.value;
    },
    setSlskdAuthenticated(state, action: PayloadAction<{ serverId: string; value: boolean }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.slskd.isAuthenticated = action.payload.value;
    },
    connectSlskd(state, action: PayloadAction<{ serverId: string }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.slskd.isAuthenticated = true;
      entry.activeDownloader = 'slskd';
    },
    disconnectSlskd(state, action: PayloadAction<{ serverId: string }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.slskd.serverUrl = '';
      entry.slskd.apiKey = '';
      entry.slskd.isAuthenticated = false;
      entry.activeDownloader = entry.activeDownloader === 'slskd' ? null : entry.activeDownloader;
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
