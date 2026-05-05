import { RootState } from '@/utils/redux/store';
import { createSelector } from '@reduxjs/toolkit';
import { PerServerListenBrainzState } from '@/utils/redux/slices/listenbrainzSlice';

const defaultEntry: PerServerListenBrainzState = {
  username: '',
  token: '',
  isAuthenticated: false,
  scrobbleEnabled: true,
  nowPlayingEnabled: true,
};

const selectListenBrainzForActiveServer = createSelector(
  [(s: RootState) => s.listenbrainz.byServer, (s: RootState) => s.servers.activeServerId],
  (byServer, activeServerId): PerServerListenBrainzState =>
    (activeServerId ? byServer[activeServerId] ?? defaultEntry : defaultEntry)
);

export const selectListenBrainzUsername = createSelector(
  [selectListenBrainzForActiveServer],
  (entry) => entry.username
);

export const selectListenBrainzToken = createSelector(
  [selectListenBrainzForActiveServer],
  (entry) => entry.token
);

export const selectListenBrainzAuthenticated = createSelector(
  [selectListenBrainzForActiveServer],
  (entry) => entry.isAuthenticated
);

export const selectListenBrainzScrobbleEnabled = createSelector(
  [selectListenBrainzForActiveServer],
  (entry) => entry.scrobbleEnabled ?? true
);

export const selectListenBrainzNowPlayingEnabled = createSelector(
  [selectListenBrainzForActiveServer],
  (entry) => entry.nowPlayingEnabled ?? true
);

export const selectListenBrainzConfig = createSelector(
  [selectListenBrainzUsername, selectListenBrainzToken],
  (username, token) =>
    username && token
      ? { username, token }
      : null
);
