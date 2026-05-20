import { RootState } from '@/utils/redux/store';
import { createSelector } from '@reduxjs/toolkit';
import { PerServerLastFmState } from '@/utils/redux/slices/lastfmSlice';

const defaultEntry: PerServerLastFmState = {
  apiKey: '',
  apiSecret: '',
  sessionKey: '',
  username: '',
  isAuthenticated: false,
  scrobbleEnabled: true,
  nowPlayingEnabled: true,
  similarArtistsEnabled: false,
};

const selectLastFmForActiveServer = createSelector(
  [(s: RootState) => s.lastfm.byServer, (s: RootState) => s.servers.activeServerId],
  (byServer, activeServerId): PerServerLastFmState =>
    (activeServerId ? byServer[activeServerId] ?? defaultEntry : defaultEntry)
);

export const selectLastFmApiKey = createSelector(
  [selectLastFmForActiveServer],
  (entry) => entry.apiKey
);

export const selectLastFmApiSecret = createSelector(
  [selectLastFmForActiveServer],
  (entry) => entry.apiSecret
);

export const selectLastFmAuthenticated = createSelector(
  [selectLastFmForActiveServer],
  (entry) => entry.isAuthenticated
);

export const selectLastFmUsername = createSelector(
  [selectLastFmForActiveServer],
  (entry) => entry.username
);

export const selectLastFmScrobbleEnabled = createSelector(
  [selectLastFmForActiveServer],
  (entry) => entry.scrobbleEnabled ?? true
);

export const selectLastFmNowPlayingEnabled = createSelector(
  [selectLastFmForActiveServer],
  (entry) => entry.nowPlayingEnabled ?? true
);

export const selectLastFmSimilarArtistsEnabled = createSelector(
  [selectLastFmForActiveServer],
  (entry) => entry.similarArtistsEnabled ?? false
);

export const selectLastFmConfig = createSelector(
  [selectLastFmForActiveServer],
  (entry) =>
    entry.isAuthenticated && entry.apiKey && entry.apiSecret && entry.sessionKey
      ? {
          apiKey: entry.apiKey,
          apiSecret: entry.apiSecret,
          sessionKey: entry.sessionKey,
          username: entry.username,
        }
      : null
);
