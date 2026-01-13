import { RootState } from '@/utils/redux/store';
import {
  AIProvider,
  AudioQuality,
  LibrarySortOrder,
  PromptHistoryEntry,
  ThemeMode,
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

export const selectAiButtonEnabled = (
  state: RootState
): boolean =>
  state.settings.aiButtonEnabled;

export const selectInternalOnlyEnabled = (
state: RootState
): boolean =>
  state.settings.internalOnlyEnabled

export const selectLibrarySortOrder = (
  state: RootState
): LibrarySortOrder =>
  state.settings.librarySortOrder;

export const selectHasSeenGetStarted = (
  state: RootState
): boolean =>
  state.settings.hasSeenGetStarted;

export const selectAudioQuality = (
  state: RootState
): AudioQuality =>
  state.settings.audioQuality;

export const selectAiProvider = (state: RootState): AIProvider =>
  state.settings.aiProvider;

export const selectAiApiKeys = (state: RootState) =>
  state.settings.aiApiKeys;

export const selectActiveAiApiKey = (state: RootState): string => {
  const provider = state.settings.aiProvider;
  return state.settings.aiApiKeys[provider];
};

export const selectPromptHistory = (
  state: RootState
): PromptHistoryEntry[] =>
  state.settings.promptHistory;

/* Analytics */
export const selectAnalyticsEnabled = (
  state: RootState
): boolean =>
  state.settings.analyticsEnabled;