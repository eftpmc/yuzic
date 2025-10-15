import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ServerType = 'navidrome' | 'jellyfin';

interface ServerState {
  type: ServerType | null;
  serverUrl: string;
  username: string;
  password: string;
  isAuthenticated: boolean;
}

const initialState: ServerState = {
  type: null,
  serverUrl: '',
  username: '',
  password: '',
  isAuthenticated: false,
};

export const serverSlice = createSlice({
  name: 'server',
  initialState,
  reducers: {
    setServerType: (state, action: PayloadAction<ServerType>) => {
      state.type = action.payload;
    },
    setServerUrl: (state, action: PayloadAction<string>) => {
      state.serverUrl = action.payload;
    },
    setUsername: (state, action: PayloadAction<string>) => {
      state.username = action.payload;
    },
    setPassword: (state, action: PayloadAction<string>) => {
      state.password = action.payload;
    },
    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    disconnect: (state) => {
      state.serverUrl = '';
      state.username = '';
      state.password = '';
      state.isAuthenticated = false;
      state.type = null;
    },
  },
});

export const {
  setServerType,
  setServerUrl,
  setUsername,
  setPassword,
  setAuthenticated,
  disconnect,
} = serverSlice.actions;

export default serverSlice.reducer;