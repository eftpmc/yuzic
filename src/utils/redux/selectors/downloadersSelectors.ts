import { RootState } from '@/utils/redux/store';
import { createSelector } from '@reduxjs/toolkit';
import { PerServerDownloadersState } from '@/utils/redux/slices/downloadersSlice';

const defaultEntry: PerServerDownloadersState = {
  activeDownloader: null,
  lidarr: { serverUrl: '', apiKey: '', isAuthenticated: false },
  slskd: { serverUrl: '', apiKey: '', isAuthenticated: false },
};

const selectDownloadersForActiveServer = createSelector(
  [(s: RootState) => s.downloaders.byServer, (s: RootState) => s.servers.activeServerId],
  (byServer, activeServerId): PerServerDownloadersState =>
    (activeServerId && byServer[activeServerId]) ?? defaultEntry
);

export const selectActiveDownloader = createSelector(
  [selectDownloadersForActiveServer],
  (entry) => entry.activeDownloader
);

export const selectLidarrServerUrl = createSelector(
  [selectDownloadersForActiveServer],
  (entry) => entry.lidarr.serverUrl
);

export const selectLidarrApiKey = createSelector(
  [selectDownloadersForActiveServer],
  (entry) => entry.lidarr.apiKey
);

export const selectLidarrAuthenticated = createSelector(
  [selectDownloadersForActiveServer],
  (entry) => entry.lidarr.isAuthenticated
);

export const selectSlskdServerUrl = createSelector(
  [selectDownloadersForActiveServer],
  (entry) => entry.slskd.serverUrl
);

export const selectSlskdApiKey = createSelector(
  [selectDownloadersForActiveServer],
  (entry) => entry.slskd.apiKey
);

export const selectSlskdAuthenticated = createSelector(
  [selectDownloadersForActiveServer],
  (entry) => entry.slskd.isAuthenticated
);

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
