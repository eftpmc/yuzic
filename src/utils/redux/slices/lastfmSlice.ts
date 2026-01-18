import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LastfmState {
  apiKey: string;
  isAuthenticated: boolean;
}

const initialState: LastfmState = {
  apiKey: '',
  isAuthenticated: false,
};

const lastfmSlice = createSlice({
  name: 'lastfm',
  initialState,
  reducers: {
    setApiKey(state, action: PayloadAction<string>) {
      state.apiKey = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setAuthenticated(state, action: PayloadAction<boolean>) {
      state.isAuthenticated = action.payload;
    },
    disconnect(state) {
      state.apiKey = '';
      state.isAuthenticated = false;
    },
  },
});

export const {
  setApiKey,
  setAuthenticated,
  disconnect,
} = lastfmSlice.actions;

export default lastfmSlice.reducer;