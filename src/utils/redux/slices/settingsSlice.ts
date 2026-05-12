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

  /* Search */
  searchScope: SearchScope;

  /* Onboarding */
  hasSeenGetStarted: boolean;

  /* Audio */
  audioQuality: AudioQuality;

  language: AppLanguage;

  /* Scrobbling */
  serverScrobbleEnabled: boolean;
  serverNowPlayingEnabled: boolean;

  /* Sync */
  lastSyncedAt: number | null;
  syncOnAppStart: boolean;
}

const initialState: SettingsState = {
  themeMode: 'system',
  themeColor: '#ff7f7f',
  gridColumns: 3,
  gridSpacing: 8,
  isGridView: true,
  playingBarAction: 'skip',

  librarySortOrder: 'title',
  searchScope: 'server+external',
  hasSeenGetStarted: false,

  audioQuality: 'medium',

  language: DEFAULT_LANGUAGE,

  serverScrobbleEnabled: true,
  serverNowPlayingEnabled: true,

  lastSyncedAt: null,
  syncOnAppStart: false,
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

    setServerScrobbleEnabled(state, action: PayloadAction<boolean>) {
      state.serverScrobbleEnabled = action.payload;
    },
    setServerNowPlayingEnabled(state, action: PayloadAction<boolean>) {
      state.serverNowPlayingEnabled = action.payload;
    },

    setLastSyncedAt(state, action: PayloadAction<number | null>) {
      state.lastSyncedAt = action.payload;
    },
    setSyncOnAppStart(state, action: PayloadAction<boolean>) {
      state.syncOnAppStart = action.payload;
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
  setSearchScope,
  setHasSeenGetStarted,
  setAudioQuality,
  setLanguage,
  setServerScrobbleEnabled,
  setServerNowPlayingEnabled,
  setLastSyncedAt,
  setSyncOnAppStart,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
