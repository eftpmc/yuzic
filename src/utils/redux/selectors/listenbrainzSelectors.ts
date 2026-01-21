import { RootState } from '@/utils/redux/store';
import { createSelector } from '@reduxjs/toolkit';

export const selectListenBrainzUsername = (s: RootState) =>
  s.listenbrainz.username;

export const selectListenBrainzToken = (s: RootState) =>
  s.listenbrainz.token;

export const selectListenBrainzAuthenticated = (s: RootState) =>
  s.listenbrainz.isAuthenticated;

export const selectListenBrainzConfig = createSelector(
  [selectListenBrainzUsername, selectListenBrainzToken],
  (username, token) =>
    username && token
      ? { username, token }
      : null
);
