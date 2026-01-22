import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type LibrarySortOrder = 'title' | 'recent' | 'userplays' | 'year';
export type AudioQuality = 'low' | 'medium' | 'high' | 'original';
export type PlayingBarAction = 'none' | 'skip' | 'favorite';
export type ThemeMode = 'light' | 'dark' | 'system';
export type SearchScope =
  | 'client'
  | 'client+external'
  | 'server'
  | 'server+external';

export interface SettingsState {
  /* UI */
  themeMode: ThemeMode;
  themeColor: string;
  gridColumns: number;
  isGridView: boolean;

  playingBarAction: PlayingBarAction;

  /* Library */
  librarySortOrder: LibrarySortOrder;

  /* Search */
  searchScope: SearchScope;

  /* Onboarding */
  hasSeenGetStarted: boolean;

  /* Audio */
  audioQuality: AudioQuality;

  /* Analytics */
  analyticsEnabled: boolean;
}

const initialState: SettingsState = {
  themeMode: 'system',
  themeColor: '#ff7f7f',
  gridColumns: 3,
  isGridView: true,
  playingBarAction: 'skip',

  librarySortOrder: 'title',
  searchScope: 'client+external',
  hasSeenGetStarted: false,

  audioQuality: 'medium',

  analyticsEnabled: false,
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

    /* Analytics */
    setAnalyticsEnabled(state, action: PayloadAction<boolean>) {
      state.analyticsEnabled = action.payload;
    },

    resetSettings: () => initialState,
  },
});

export const {
  setThemeMode,
  setThemeColor,
  setGridColumns,
  setIsGridView,
  setPlayingBarAction,
  setLibrarySortOrder,
  setSearchScope,
  setHasSeenGetStarted,
  setAudioQuality,
  setAnalyticsEnabled,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;