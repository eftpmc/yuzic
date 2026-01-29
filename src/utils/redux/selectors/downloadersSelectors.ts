import { RootState } from '@/utils/redux/store';
import { createSelector } from '@reduxjs/toolkit';

export const selectActiveDownloader = (s: RootState) => s.downloaders.activeDownloader;
export const selectLidarrServerUrl = (s: RootState) => s.downloaders.lidarr.serverUrl;
export const selectLidarrApiKey = (s: RootState) => s.downloaders.lidarr.apiKey;
export const selectLidarrAuthenticated = (s: RootState) => s.downloaders.lidarr.isAuthenticated;
export const selectSlskdServerUrl = (s: RootState) => s.downloaders.slskd.serverUrl;
export const selectSlskdApiKey = (s: RootState) => s.downloaders.slskd.apiKey;
export const selectSlskdAuthenticated = (s: RootState) => s.downloaders.slskd.isAuthenticated;

export const selectLidarrConfig = createSelector(
  [selectLidarrServerUrl, selectLidarrApiKey],
  (serverUrl, apiKey) => ({ serverUrl, apiKey })
);

export const selectSlskdConfig = createSelector(
  [selectSlskdServerUrl, selectSlskdApiKey],
  (serverUrl, apiKey) => ({ serverUrl, apiKey })
);

export const selectIsLidarrActive = createSelector(
  [selectActiveDownloader],
  (active) => active === 'lidarr'
);

export const selectIsSlskdActive = createSelector(
  [selectActiveDownloader],
  (active) => active === 'slskd'
);
