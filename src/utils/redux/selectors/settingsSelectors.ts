import { RootState } from '@/utils/redux/store';
import {
  AudioQuality,
  LibrarySortOrder,
  ThemeMode,
  SearchScope
} from '@/utils/redux/slices/settingsSlice';

export const selectSettings = (state: RootState) => state.settings;

export const selectThemeMode = (state: RootState): ThemeMode =>
  state.settings.themeMode;

export const selectThemeColor = (state: RootState): string =>
  state.settings.themeColor;

export const selectGridColumns = (state: RootState): number =>
  state.settings.gridColumns;

export const selectIsGridView = (state: RootState): boolean =>
  state.settings.isGridView;

export const selectPlayingBarAction = (state: RootState) =>
  state.settings.playingBarAction;

export const selectLibrarySortOrder = (
  state: RootState
): LibrarySortOrder =>
  state.settings.librarySortOrder;

export const selectSearchScope = (
  state: RootState
): SearchScope =>
  state.settings.searchScope;


export const selectHasSeenGetStarted = (
  state: RootState
): boolean =>
  state.settings.hasSeenGetStarted;

export const selectAudioQuality = (
  state: RootState
): AudioQuality =>
  state.settings.audioQuality;

export const selectAnalyticsEnabled = (
  state: RootState
): boolean =>
  state.settings.analyticsEnabled;