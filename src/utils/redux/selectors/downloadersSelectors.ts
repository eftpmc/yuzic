import { RootState } from '@/utils/redux/store';
import { createSelector } from '@reduxjs/toolkit';
import {
  DOWNLOADER_IDS,
  DownloaderConnection,
  DownloaderId,
  PerServerDownloadersState,
} from '@/utils/redux/slices/downloadersSlice';
import { DEFAULT_SLSKD_PREFERENCES, type SlskdSearchPreferences } from '@/api/slskd';

const emptyConnection: DownloaderConnection = { serverUrl: '', apiKey: '', isAuthenticated: false };

const defaultEntry: PerServerDownloadersState = {
  lidarr: emptyConnection,
  slskd: emptyConnection,
};

export const selectDownloadersForActiveServer = createSelector(
  [(s: RootState) => s.downloaders.byServer, (s: RootState) => s.servers.activeServerId],
  (byServer, activeServerId): PerServerDownloadersState =>
    (activeServerId ? byServer[activeServerId] ?? defaultEntry : defaultEntry)
);

export interface DownloaderSelectors {
  serverUrl: (s: RootState) => string;
  apiKey: (s: RootState) => string;
  isAuthenticated: (s: RootState) => boolean;
  config: (s: RootState) => { serverUrl: string; apiKey: string };
}

function buildSelectors(id: DownloaderId): DownloaderSelectors {
  const connection = createSelector(
    [selectDownloadersForActiveServer],
    (entry) => entry[id] ?? emptyConnection
  );
  const serverUrl = createSelector([connection], (c) => c.serverUrl);
  const apiKey = createSelector([connection], (c) => c.apiKey);
  const isAuthenticated = createSelector([connection], (c) => c.isAuthenticated);
  const config = createSelector([serverUrl, apiKey], (serverUrl, apiKey) => ({ serverUrl, apiKey }));
  return { serverUrl, apiKey, isAuthenticated, config };
}

export const downloaderSelectors = Object.fromEntries(
  DOWNLOADER_IDS.map((id) => [id, buildSelectors(id)])
) as Record<DownloaderId, DownloaderSelectors>;

export const selectLidarrServerUrl = downloaderSelectors.lidarr.serverUrl;
export const selectLidarrApiKey = downloaderSelectors.lidarr.apiKey;
export const selectLidarrAuthenticated = downloaderSelectors.lidarr.isAuthenticated;
export const selectSlskdServerUrl = downloaderSelectors.slskd.serverUrl;
export const selectSlskdApiKey = downloaderSelectors.slskd.apiKey;
export const selectSlskdAuthenticated = downloaderSelectors.slskd.isAuthenticated;
export const selectLidarrConfig = downloaderSelectors.lidarr.config;
export const selectSlskdConfig = downloaderSelectors.slskd.config;

const selectSlskdConnection = createSelector(
  [selectDownloadersForActiveServer],
  (entry) => entry.slskd ?? emptyConnection
);

/**
 * Merges the user's stored slskd preferences with the built-in defaults, so
 * a partially-saved value (e.g. only min bitrate set) still gets defaults for
 * the other fields. Unknown keys are dropped — this is user-controlled.
 */
export const selectSlskdPreferences = createSelector(
  [selectSlskdConnection],
  (connection): SlskdSearchPreferences => {
    const stored = connection.preferences as Partial<SlskdSearchPreferences> | undefined;
    return {
      preferredFormat: stored?.preferredFormat ?? DEFAULT_SLSKD_PREFERENCES.preferredFormat,
      minBitrateKbps: stored?.minBitrateKbps ?? DEFAULT_SLSKD_PREFERENCES.minBitrateKbps,
      preferFreeSlot: stored?.preferFreeSlot ?? DEFAULT_SLSKD_PREFERENCES.preferFreeSlot,
    };
  }
);

/** Slskd config with preferences bundled in, for the code paths that need them. */
export const selectSlskdConfigWithPreferences = createSelector(
  [selectSlskdConfig, selectSlskdPreferences],
  (config, preferences) => ({ ...config, preferences })
);
