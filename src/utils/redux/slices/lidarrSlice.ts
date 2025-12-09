import { createSlice } from '@reduxjs/toolkit';

interface LidarrState {
    serverUrl: string;
    apiKey: string;
    isAuthenticated: boolean;
}

const initialState: LidarrState = {
    serverUrl: '',
    apiKey: '',
    isAuthenticated: false,
};

const lidarrSlice = createSlice({
    name: 'lidarr',
    initialState,
    reducers: {
        setServerUrl(state, action) {
            state.serverUrl = action.payload;
        },
        setApiKey(state, action) {
            state.apiKey = action.payload;
        },
        setAuthenticated(state, action) {
            state.isAuthenticated = action.payload;
        },
        disconnect(state) {
            state.serverUrl = '';
            state.apiKey = '';
            state.isAuthenticated = false;
        },
    },
});

export const { setServerUrl, setApiKey, setAuthenticated, disconnect } = lidarrSlice.actions;
export default lidarrSlice.reducer;