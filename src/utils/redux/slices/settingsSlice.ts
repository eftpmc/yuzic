import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_LANGUAGE } from '@/constants/languages';
import type { RadiusPreset } from '@/constants/design';

export type LibrarySortOrder = 'title' | 'recent' | 'userplays' | 'year';
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
  /**
   * Corner-radius preset. Live-reactive — components read scaled values via
   * `useRadius()` and re-render on change. The static `radius` export in
   * constants/design.ts continues to hold defaults for unmigrated surfaces.
   */
  radiusPreset: RadiusPreset;
  gridColumns: number;
  gridSpacing: number;
  isGridView: boolean;

  playingBarAction: PlayingBarAction;
  showQualityBadge: boolean;
  showSourceHeaders: boolean;

  /* Library */
  librarySortOrder: LibrarySortOrder;

  /* Search */
  searchScope: SearchScope;

  /* Onboarding */
  hasSeenGetStarted: boolean;

  /* Audio */
  wifiStreamQuality: AudioQuality;
  cellularStreamQuality: AudioQuality;
  downloadQuality: AudioQuality;
  preferredCodec: PreferredCodec;
  /** Auto-download songs newly added to the library after a sync. */
  autoDownloadNewSongs: boolean;

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
  showJumpButtons: boolean;
  showVolumeSlider: boolean;
  autoplayEnabled: boolean;
  hapticsEnabled: boolean;
  /** When true, respect the system's reduce-motion setting; when false, always animate. */
  respectReducedMotion: boolean;

  /* Sync */
  lastSyncedAt: number | null;
  syncOnAppStart: boolean;
}

const initialState: SettingsState = {
  themeMode: 'system',
  themeColor: '#ff7f7f',
  radiusPreset: 'default',
  gridColumns: 3,
  gridSpacing: 8,
  isGridView: true,
  playingBarAction: 'skip',
  showQualityBadge: false,
  showSourceHeaders: true,

  librarySortOrder: 'title',
  searchScope: 'server',
  hasSeenGetStarted: false,

  wifiStreamQuality: 'original',
  cellularStreamQuality: 'high',
  downloadQuality: 'high',
  preferredCodec: 'mp3',
  autoDownloadNewSongs: false,

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
  showJumpButtons: false,
  showVolumeSlider: false,
  autoplayEnabled: false,
  hapticsEnabled: true,
  respectReducedMotion: true,

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
    setRadiusPreset(state, action: PayloadAction<RadiusPreset>) {
      state.radiusPreset = action.payload;
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
    setShowQualityBadge(state, action: PayloadAction<boolean>) {
      state.showQualityBadge = action.payload;
    },
    setShowSourceHeaders(state, action: PayloadAction<boolean>) {
      state.showSourceHeaders = action.payload;
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
    setAutoDownloadNewSongs(state, action: PayloadAction<boolean>) {
      state.autoDownloadNewSongs = action.payload;
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
    setShowJumpButtons(state, action: PayloadAction<boolean>) {
      state.showJumpButtons = action.payload;
    },
    setShowVolumeSlider(state, action: PayloadAction<boolean>) {
      state.showVolumeSlider = action.payload;
    },
    setHapticsEnabled(state, action: PayloadAction<boolean>) {
      state.hapticsEnabled = action.payload;
    },
    setRespectReducedMotion(state, action: PayloadAction<boolean>) {
      state.respectReducedMotion = action.payload;
    },
    setAutoplayEnabled(state, action: PayloadAction<boolean>) {
      state.autoplayEnabled = action.payload;
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
  setRadiusPreset,
  setGridColumns,
  setGridSpacing,
  setIsGridView,
  setPlayingBarAction,
  setShowQualityBadge,
  setShowSourceHeaders,
  setLibrarySortOrder,
  setSearchScope,
  setHasSeenGetStarted,
  setWifiStreamQuality,
  setCellularStreamQuality,
  setDownloadQuality,
  setAutoDownloadNewSongs,
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
  setShowJumpButtons,
  setShowVolumeSlider,
  setHapticsEnabled,
  setRespectReducedMotion,
  setShowPlaybackSpeed,
  setAutoplayEnabled,
  setLastSyncedAt,
  setSyncOnAppStart,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
