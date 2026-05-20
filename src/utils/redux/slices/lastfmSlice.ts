import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PerServerLastFmState {
  apiKey: string;
  apiSecret: string;
  sessionKey: string;
  username: string;
  isAuthenticated: boolean;
  scrobbleEnabled: boolean;
  nowPlayingEnabled: boolean;
  similarArtistsEnabled: boolean;
}

export interface LastFmState {
  byServer: Record<string, PerServerLastFmState>;
}

const defaultPerServer: PerServerLastFmState = {
  apiKey: '',
  apiSecret: '',
  sessionKey: '',
  username: '',
  isAuthenticated: false,
  scrobbleEnabled: false,
  nowPlayingEnabled: false,
  similarArtistsEnabled: false,
};

const initialState: LastFmState = {
  byServer: {},
};

function getOrCreate(state: LastFmState, serverId: string): PerServerLastFmState {
  if (!state.byServer[serverId]) {
    state.byServer[serverId] = { ...defaultPerServer };
  }
  return state.byServer[serverId];
}

const lastfmSlice = createSlice({
  name: 'lastfm',
  initialState,
  reducers: {
    setApiKey(state, action: PayloadAction<{ serverId: string; value: string }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.apiKey = action.payload.value;
      entry.isAuthenticated = false;
    },
    setApiSecret(state, action: PayloadAction<{ serverId: string; value: string }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.apiSecret = action.payload.value;
      entry.isAuthenticated = false;
    },
    setSessionData(
      state,
      action: PayloadAction<{ serverId: string; sessionKey: string; username: string }>
    ) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.sessionKey = action.payload.sessionKey;
      entry.username = action.payload.username;
      entry.isAuthenticated = true;
    },
    setAuthenticated(state, action: PayloadAction<{ serverId: string; value: boolean }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.isAuthenticated = action.payload.value;
    },
    setScrobbleEnabled(state, action: PayloadAction<{ serverId: string; value: boolean }>) {
      getOrCreate(state, action.payload.serverId).scrobbleEnabled = action.payload.value;
    },
    setNowPlayingEnabled(state, action: PayloadAction<{ serverId: string; value: boolean }>) {
      getOrCreate(state, action.payload.serverId).nowPlayingEnabled = action.payload.value;
    },
    setSimilarArtistsEnabled(state, action: PayloadAction<{ serverId: string; value: boolean }>) {
      getOrCreate(state, action.payload.serverId).similarArtistsEnabled = action.payload.value;
    },
    disconnect(state, action: PayloadAction<{ serverId: string }>) {
      state.byServer[action.payload.serverId] = { ...defaultPerServer };
    },
  },
});

export const {
  setApiKey,
  setApiSecret,
  setSessionData,
  setAuthenticated,
  setScrobbleEnabled,
  setNowPlayingEnabled,
  setSimilarArtistsEnabled,
  disconnect,
} = lastfmSlice.actions;

export default lastfmSlice.reducer;
