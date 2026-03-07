import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_LANGUAGE } from '@/constants/languages';

export type LibrarySortOrder = 'title' | 'recent' | 'userplays' | 'year';
export type AudioQuality = 'low' | 'medium' | 'high' | 'original';
export type PlayingBarAction = 'none' | 'skip' | 'favorite' | 'randomAlbum' | 'addToPlaylist';
export type ThemeMode = 'light' | 'dark' | 'system';
export type SearchScope =
  | 'client'
  | 'client+external'
  | 'server'
  | 'server+external';
export type AppLanguage = string;

export interface SettingsState {
  /* UI */
  themeMode: ThemeMode;
  themeColor: string;
  gridColumns: number;
  gridSpacing: number;
  isGridView: boolean;

  playingBarAction: PlayingBarAction;

  /* Library */
  librarySortOrder: LibrarySortOrder;
  offlineModeEnabled: boolean;

  /* Search */
  searchScope: SearchScope;

  /* Onboarding */
  hasSeenGetStarted: boolean;

  /* Audio */
  audioQuality: AudioQuality;

  language: AppLanguage
}

const initialState: SettingsState = {
  themeMode: 'system',
  themeColor: '#ff7f7f',
  gridColumns: 3,
  gridSpacing: 8,
  isGridView: true,
  playingBarAction: 'skip',

  librarySortOrder: 'title',
  offlineModeEnabled: false,
  searchScope: 'client+external',
  hasSeenGetStarted: false,

  audioQuality: 'medium',

  language: DEFAULT_LANGUAGE
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    /* UI */
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
    },
    setThemeColor(state, action: PayloadAction<string>) {
      state.themeColor = action.payload;
    },
    setGridColumns(state, action: PayloadAction<number>) {
      state.gridColumns = action.payload;
    },
    setGridSpacing(state, action: PayloadAction<number>) {
      state.gridSpacing = action.payload;
    },
    setIsGridView(state, action: PayloadAction<boolean>) {
      state.isGridView = action.payload;
    },
    setPlayingBarAction(
      state,
      action: PayloadAction<PlayingBarAction>
    ) {
      state.playingBarAction = action.payload;
    },

    /* Library */
    setLibrarySortOrder(state, action: PayloadAction<LibrarySortOrder>) {
      state.librarySortOrder = action.payload;
    },
    setOfflineModeEnabled(state, action: PayloadAction<boolean>) {
      state.offlineModeEnabled = action.payload;
    },

    setSearchScope(state, action: PayloadAction<SearchScope>) {
      state.searchScope = action.payload;
    },

    /* Onboarding */
    setHasSeenGetStarted(state, action: PayloadAction<boolean>) {
      state.hasSeenGetStarted = action.payload;
    },

    /* Audio */
    setAudioQuality(state, action: PayloadAction<AudioQuality>) {
      state.audioQuality = action.payload;
    },

    setLanguage(state, action: PayloadAction<AppLanguage>) {
      state.language = action.payload;
    },

    resetSettings: () => initialState,
  },
});

export const {
  setThemeMode,
  setThemeColor,
  setGridColumns,
  setGridSpacing,
  setIsGridView,
  setPlayingBarAction,
  setLibrarySortOrder,
  setOfflineModeEnabled,
  setSearchScope,
  setHasSeenGetStarted,
  setAudioQuality,
  setLanguage,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;