import { RootState } from '@/utils/redux/store';
import { createSelector } from '@reduxjs/toolkit';

export const selectLastfmApiKey = (s: RootState) => s.lastfm.apiKey;
export const selectLastfmAuthenticated = (s: RootState) => s.lastfm.isAuthenticated;

export const selectLastfmConfig = createSelector(
  [selectLastfmApiKey],
  (apiKey) => ({
    apiKey,
  })
);