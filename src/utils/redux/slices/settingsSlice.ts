import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_LANGUAGE } from '@/constants/languages';

export type LibrarySortOrder = 'title' | 'recent' | 'userplays' | 'year' | 'recentlyAdded';
export type LibraryCategory = 'albums' | 'artists' | 'playlists' | 'songs' | 'downloaded';
export type AudioQuality = 'low' | 'medium' | 'high' | 'original';
export type PreferredCodec = 'mp3' | 'opus';
export type PlayingBarAction = 'none' | 'skip' | 'favorite' | 'randomAlbum' | 'addToPlaylist' | 'cast';
export type ThemeMode = 'light' | 'dark' | 'system';
export type SearchScope = 'client' | 'server';
export type AppLanguage = string;

export interface SettingsState {
  /* UI */
  themeMode: ThemeMode;
  themeColor: string;
  gridColumns: number;
  gridSpacing: number;

  playingBarAction: PlayingBarAction;
  showQualityBadge: boolean;
  showSourceHeaders: boolean;

  /* Library */
  libraryGridViewByCategory: Record<LibraryCategory, boolean>;
  librarySortOrderByCategory: Record<LibraryCategory, LibrarySortOrder>;

  /* Search */
  searchScope: SearchScope;

  /* Onboarding */
  hasSeenGetStarted: boolean;

  /* Audio */
  wifiStreamQuality: AudioQuality;
  cellularStreamQuality: AudioQuality;
  downloadQuality: AudioQuality;
  preferredCodec: PreferredCodec;

  language: AppLanguage;

  /* Scrobbling */
  serverScrobbleEnabled: boolean;
  serverNowPlayingEnabled: boolean;

  /* Integrations */
  deezerDiscoveryEnabled: boolean;
  deezerSearchEnabled: boolean;
  deezerExternalEnabled: boolean;
  deezerTopTracksEnabled: boolean;
  deezerSimilarArtistsEnabled: boolean;
  deezerAlbumRecommendationsEnabled: boolean;
  deezerSamplesEnabled: boolean;
  deezerPlaylistRecommendationsEnabled: boolean;
  musicbrainzExternalEnabled: boolean;

  /* Player controls */
  showSleepTimer: boolean;
  showPlaybackSpeed: boolean;
  crossfadeEnabled: boolean;
  crossfadeDurationSeconds: number;

  /* Sync */
  lastSyncedAt: number | null;
  syncOnAppStart: boolean;
}

const initialState: SettingsState = {
  themeMode: 'system',
  themeColor: '#ff7f7f',
  gridColumns: 3,
  gridSpacing: 8,
  playingBarAction: 'skip',
  showQualityBadge: false,
  showSourceHeaders: true,

  libraryGridViewByCategory: { albums: true, artists: true, playlists: true, songs: false, downloaded: true },
  librarySortOrderByCategory: { albums: 'recentlyAdded', artists: 'title', playlists: 'recent', songs: 'title', downloaded: 'title' },
  searchScope: 'server',
  hasSeenGetStarted: false,

  wifiStreamQuality: 'original',
  cellularStreamQuality: 'high',
  downloadQuality: 'high',
  preferredCodec: 'mp3',

  language: DEFAULT_LANGUAGE,

  serverScrobbleEnabled: true,
  serverNowPlayingEnabled: true,

  deezerDiscoveryEnabled: false,
  deezerSearchEnabled: false,
  deezerExternalEnabled: false,
  deezerTopTracksEnabled: false,
  deezerSimilarArtistsEnabled: false,
  deezerAlbumRecommendationsEnabled: false,
  deezerSamplesEnabled: false,
  deezerPlaylistRecommendationsEnabled: false,
  musicbrainzExternalEnabled: false,

  showSleepTimer: true,
  showPlaybackSpeed: false,
  crossfadeEnabled: false,
  crossfadeDurationSeconds: 3,

  lastSyncedAt: null,
  syncOnAppStart: true,
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
    setLibraryGridView(
      state,
      action: PayloadAction<{ category: LibraryCategory; value: boolean }>
    ) {
      state.libraryGridViewByCategory[action.payload.category] = action.payload.value;
    },
    setPlayingBarAction(
      state,
      action: PayloadAction<PlayingBarAction>
    ) {
      state.playingBarAction = action.payload;
    },
    setShowQualityBadge(state, action: PayloadAction<boolean>) {
      state.showQualityBadge = action.payload;
    },
    setShowSourceHeaders(state, action: PayloadAction<boolean>) {
      state.showSourceHeaders = action.payload;
    },

    /* Library */
    setLibrarySortOrder(
      state,
      action: PayloadAction<{ category: LibraryCategory; value: LibrarySortOrder }>
    ) {
      state.librarySortOrderByCategory[action.payload.category] = action.payload.value;
    },

    setSearchScope(state, action: PayloadAction<SearchScope>) {
      state.searchScope = action.payload;
    },

    /* Onboarding */
    setHasSeenGetStarted(state, action: PayloadAction<boolean>) {
      state.hasSeenGetStarted = action.payload;
    },

    /* Audio */
    setWifiStreamQuality(state, action: PayloadAction<AudioQuality>) {
      state.wifiStreamQuality = action.payload;
    },
    setCellularStreamQuality(state, action: PayloadAction<AudioQuality>) {
      state.cellularStreamQuality = action.payload;
    },
    setDownloadQuality(state, action: PayloadAction<AudioQuality>) {
      state.downloadQuality = action.payload;
    },
    setPreferredCodec(state, action: PayloadAction<PreferredCodec>) {
      state.preferredCodec = action.payload;
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

    setDeezerDiscoveryEnabled(state, action: PayloadAction<boolean>) {
      state.deezerDiscoveryEnabled = action.payload;
    },
    setDeezerSearchEnabled(state, action: PayloadAction<boolean>) {
      state.deezerSearchEnabled = action.payload;
    },
    setDeezerExternalEnabled(state, action: PayloadAction<boolean>) {
      state.deezerExternalEnabled = action.payload;
    },
    setMusicbrainzExternalEnabled(state, action: PayloadAction<boolean>) {
      state.musicbrainzExternalEnabled = action.payload;
    },
    setDeezerTopTracksEnabled(state, action: PayloadAction<boolean>) {
      state.deezerTopTracksEnabled = action.payload;
    },
    setDeezerSimilarArtistsEnabled(state, action: PayloadAction<boolean>) {
      state.deezerSimilarArtistsEnabled = action.payload;
    },
    setDeezerAlbumRecommendationsEnabled(state, action: PayloadAction<boolean>) {
      state.deezerAlbumRecommendationsEnabled = action.payload;
    },
    setDeezerSamplesEnabled(state, action: PayloadAction<boolean>) {
      state.deezerSamplesEnabled = action.payload;
    },
    setDeezerPlaylistRecommendationsEnabled(state, action: PayloadAction<boolean>) {
      state.deezerPlaylistRecommendationsEnabled = action.payload;
    },

    setShowSleepTimer(state, action: PayloadAction<boolean>) {
      state.showSleepTimer = action.payload;
    },
    setShowPlaybackSpeed(state, action: PayloadAction<boolean>) {
      state.showPlaybackSpeed = action.payload;
    },
    setCrossfadeEnabled(state, action: PayloadAction<boolean>) {
      state.crossfadeEnabled = action.payload;
    },
    setCrossfadeDurationSeconds(state, action: PayloadAction<number>) {
      const duration = Number.isFinite(action.payload) ? Math.round(action.payload) : 3;
      state.crossfadeDurationSeconds = Math.min(12, Math.max(1, duration));
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
  setLibraryGridView,
  setPlayingBarAction,
  setShowQualityBadge,
  setShowSourceHeaders,
  setLibrarySortOrder,
  setSearchScope,
  setHasSeenGetStarted,
  setWifiStreamQuality,
  setCellularStreamQuality,
  setDownloadQuality,
  setPreferredCodec,
  setLanguage,
  setServerScrobbleEnabled,
  setServerNowPlayingEnabled,
  setDeezerDiscoveryEnabled,
  setDeezerSearchEnabled,
  setDeezerExternalEnabled,
  setMusicbrainzExternalEnabled,
  setDeezerTopTracksEnabled,
  setDeezerSimilarArtistsEnabled,
  setDeezerAlbumRecommendationsEnabled,
  setDeezerSamplesEnabled,
  setDeezerPlaylistRecommendationsEnabled,
  setShowSleepTimer,
  setShowPlaybackSpeed,
  setCrossfadeEnabled,
  setCrossfadeDurationSeconds,
  setLastSyncedAt,
  setSyncOnAppStart,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
