import { RootState } from '@/utils/redux/store';
import {
  AudioQuality,
  LibrarySortOrder,
  ThemeMode,
  SearchScope,
  AppLanguage
} from '@/utils/redux/slices/settingsSlice';

export const selectSettings = (state: RootState) => state.settings;

export const selectThemeMode = (state: RootState): ThemeMode =>
  state.settings.themeMode;

export const selectThemeColor = (state: RootState): string =>
  state.settings.themeColor;

export const selectGridColumns = (state: RootState): number =>
  state.settings.gridColumns;

export const selectGridSpacing = (state: RootState): number =>
  state.settings.gridSpacing;

export const selectIsGridView = (state: RootState): boolean =>
  state.settings.isGridView;

export const selectPlayingBarAction = (state: RootState) =>
  state.settings.playingBarAction;

export const selectLibrarySortOrder = (
  state: RootState
): LibrarySortOrder =>
  state.settings.librarySortOrder;

export const selectOfflineModeEnabled = (
  state: RootState
): boolean =>
  state.settings.offlineModeEnabled;

export const selectSearchScope = (
  state: RootState
): SearchScope =>
  state.settings.searchScope;

export const selectLanguage = (
  state: RootState
): AppLanguage =>
  state.settings.language;

export const selectHasSeenGetStarted = (
  state: RootState
): boolean =>
  state.settings.hasSeenGetStarted;

export const selectAudioQuality = (
  state: RootState
): AudioQuality =>
  state.settings.audioQuality;