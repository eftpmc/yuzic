import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ServerType = "navidrome" | "jellyfin" | "none";

interface ServerState {
  type: ServerType;
  serverUrl: string;
  username: string;
  password: string;
  token: string;
  userId: string;
  isAuthenticated: boolean;
}

const initialState: ServerState = {
  type: "none",
  serverUrl: "",
  username: "",
  password: "",
  token: "",
  userId: "",
  isAuthenticated: false
};

export const serverSlice = createSlice({
  name: "server",
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
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    setUserId: (state, action: PayloadAction<string>) => {
      state.userId = action.payload;
    },
    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    disconnect: () => initialState
  }
});

export const {
  setServerType,
  setServerUrl,
  setUsername,
  setPassword,
  setToken,
  setUserId,
  setAuthenticated,
  disconnect
} = serverSlice.actions;

export default serverSlice.reducer;