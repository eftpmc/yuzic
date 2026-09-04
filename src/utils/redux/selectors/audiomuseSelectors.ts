import { RootState } from '@/utils/redux/store';
import { createSelector } from '@reduxjs/toolkit';
import { AudiomuseConnection } from '@/utils/redux/slices/audiomuseSlice';

const emptyConnection: AudiomuseConnection = {
  serverUrl: '',
  apiToken: '',
  isEnabled: false,
  isAuthenticated: false,
};

export const selectAudiomuseForActiveServer = createSelector(
  [(s: RootState) => s.audiomuse.byServer, (s: RootState) => s.servers.activeServerId],
  (byServer, activeServerId): AudiomuseConnection =>
    (activeServerId ? byServer[activeServerId] ?? emptyConnection : emptyConnection)
);

export const selectAudiomuseServerUrl = createSelector(
  [selectAudiomuseForActiveServer],
  (c) => c.serverUrl
);
export const selectAudiomuseApiToken = createSelector(
  [selectAudiomuseForActiveServer],
  (c) => c.apiToken
);
export const selectAudiomuseEnabled = createSelector(
  [selectAudiomuseForActiveServer],
  (c) => c.isEnabled
);
export const selectAudiomuseAuthenticated = createSelector(
  [selectAudiomuseForActiveServer],
  (c) => c.isAuthenticated
);

export const selectAudiomuseConfig = createSelector(
  [selectAudiomuseServerUrl, selectAudiomuseApiToken],
  (serverUrl, apiToken) => ({ serverUrl, apiToken })
);

// The gate Smart Shuffle tiering and Smooth Transitions check before using AudioMuse-AI.
export const selectIsAudiomuseConfigured = createSelector(
  [selectAudiomuseServerUrl, selectAudiomuseApiToken, selectAudiomuseEnabled, selectAudiomuseAuthenticated],
  (serverUrl, apiToken, isEnabled, isAuthenticated) =>
    Boolean(serverUrl && apiToken && isEnabled && isAuthenticated)
);
