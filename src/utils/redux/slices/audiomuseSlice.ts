import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AudiomuseConnection {
  serverUrl: string;
  apiToken: string;
  isEnabled: boolean;
  isAuthenticated: boolean;
}

export interface AudiomuseState {
  byServer: Record<string, AudiomuseConnection>;
}

const emptyConnection: AudiomuseConnection = {
  serverUrl: '',
  apiToken: '',
  isEnabled: false,
  isAuthenticated: false,
};

const initialState: AudiomuseState = {
  byServer: {},
};

function getOrCreate(state: AudiomuseState, serverId: string): AudiomuseConnection {
  if (!state.byServer[serverId]) {
    state.byServer[serverId] = { ...emptyConnection };
  }
  return state.byServer[serverId];
}

type ServerRef = { serverId: string };

const audiomuseSlice = createSlice({
  name: 'audiomuse',
  initialState,
  reducers: {
    setAudiomuseServerUrl(state, action: PayloadAction<ServerRef & { value: string }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.serverUrl = action.payload.value;
    },
    setAudiomuseApiToken(state, action: PayloadAction<ServerRef & { value: string }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.apiToken = action.payload.value;
    },
    setAudiomuseEnabled(state, action: PayloadAction<ServerRef & { value: boolean }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.isEnabled = action.payload.value;
    },
    setAudiomuseAuthenticated(state, action: PayloadAction<ServerRef & { value: boolean }>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.isAuthenticated = action.payload.value;
    },
    connectAudiomuse(state, action: PayloadAction<ServerRef>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.isAuthenticated = true;
    },
    disconnectAudiomuse(state, action: PayloadAction<ServerRef>) {
      const entry = getOrCreate(state, action.payload.serverId);
      entry.serverUrl = '';
      entry.apiToken = '';
      entry.isEnabled = false;
      entry.isAuthenticated = false;
    },
  },
});

export const {
  setAudiomuseServerUrl,
  setAudiomuseApiToken,
  setAudiomuseEnabled,
  setAudiomuseAuthenticated,
  connectAudiomuse,
  disconnectAudiomuse,
} = audiomuseSlice.actions;

export default audiomuseSlice.reducer;
