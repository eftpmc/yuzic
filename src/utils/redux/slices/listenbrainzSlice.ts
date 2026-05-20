import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PerServerListenBrainzState {
  username: string;
  token: string;
  isAuthenticated: boolean;
  scrobbleEnabled: boolean;
  nowPlayingEnabled: boolean;
}

export interface ListenBrainzState {
  byServer: Record<string, PerServerListenBrainzState>;
}

const defaultPerServer: PerServerListenBrainzState = {
  username: '',
  token: '',
  isAuthenticated: false,
  scrobbleEnabled: false,
  nowPlayingEnabled: false,
};

const initialState: ListenBrainzState = {
  byServer: {},
};

function getOrCreate(state: ListenBrainzState, serverId: string): PerServerListenBrainzState {
  if (!state.byServer[serverId]) {
    state.byServer[serverId] = { ...defaultPerServer };
  }
  return state.byServer[serverId];
}

const listenbrainzSlice = createSlice({
  name: 'listenbrainz',
  initialState,
  reducers: {
    setUsername(state, action: PayloadAction<{ serverId: string; value: string }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.username = action.payload.value;
      entry.isAuthenticated = false;
    },
    setToken(state, action: PayloadAction<{ serverId: string; value: string }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.token = action.payload.value;
      entry.isAuthenticated = false;
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
    disconnect(state, action: PayloadAction<{ serverId: string }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.username = '';
      entry.token = '';
      entry.isAuthenticated = false;
    },
  },
});

export const {
  setUsername,
  setToken,
  setAuthenticated,
  setScrobbleEnabled,
  setNowPlayingEnabled,
  disconnect,
} = listenbrainzSlice.actions;

export default listenbrainzSlice.reducer;
