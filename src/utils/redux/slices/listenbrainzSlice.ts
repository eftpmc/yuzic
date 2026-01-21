import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ListenBrainzState {
  username: string;
  token: string;
  isAuthenticated: boolean;
}

const initialState: ListenBrainzState = {
  username: '',
  token: '',
  isAuthenticated: false,
};

const listenbrainzSlice = createSlice({
  name: 'listenbrainz',
  initialState,
  reducers: {
    setUsername(state, action: PayloadAction<string>) {
      state.username = action.payload;
      state.isAuthenticated = false;
    },
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      state.isAuthenticated = false;
    },
    setAuthenticated(state, action: PayloadAction<boolean>) {
      state.isAuthenticated = action.payload;
    },
    disconnect(state) {
      state.username = '';
      state.token = '';
      state.isAuthenticated = false;
    },
  },
});

export const {
  setUsername,
  setToken,
  setAuthenticated,
  disconnect,
} = listenbrainzSlice.actions;

export default listenbrainzSlice.reducer;