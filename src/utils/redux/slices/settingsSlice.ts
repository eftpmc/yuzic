import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_LANGUAGE } from '@/constants/languages';
import type { ListDensity, RadiusPreset } from '@/constants/design';

export type LibrarySortOrder = 'title' | 'recent' | 'userplays' | 'year';

/**
 * The collections that remember their own grid/list choice.
 *
 * Mirrors `LibraryCollectionType` in screens/library/librarySort, kept here as
 * its own type so the settings slice doesn't reach up into a screen for it.
 */
export type LibraryViewKey =
  | 'playlists'
  | 'albums'
  | 'artists'
  | 'tracks'
  | 'downloaded';

/**
 * What each collection shows before the user says otherwise.
 *
 * Artwork is the thing you scan an album or artist list for, so those are
 * grids. A track is a title — the art beside it is its album's, repeated once
 * per song on the record — so tracks and the mixed downloads list are rows,
 * where the title gets the width instead of a caption under a thumbnail.
 */
export const LIBRARY_VIEW_DEFAULTS: Record<LibraryViewKey, boolean> = {
  playlists: true,
  albums: true,
  artists: true,
  tracks: false,
  downloaded: false,
};
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
  /**
   * How much air sits between rows in a list. Live-reactive the same way the
   * radius preset is — rows read it through `useListDensity()`.
   */
  listDensity: ListDensity;
  /**
   * Tint a detail screen with a colour taken from its cover art. On by
   * default: it is most of what makes an album page look like that album.
   * Off gives every screen the flat theme background instead.
   */
  coverAccentEnabled: boolean;
  gridColumns: number;
  gridSpacing: number;
  isGridView: boolean;
  /**
   * Per-collection overrides for {@link isGridView}.
   *
   * One flag used to drive every collection screen, so switching Tracks to a
   * list — which is what a list of 500 songs wants, since a three-up grid
   * truncates every title and shows the same artwork nine times — also flipped
   * Albums and Artists, where the grid is the right drawing. The kinds want
   * different answers, so they get to hold different ones.
   *
   * Absent keys fall back to `LIBRARY_VIEW_DEFAULTS` and then to `isGridView`,
   * which is what keeps this additive: a user upgrading with no overrides
   * stored sees the per-kind defaults, not a reset.
   */
  libraryViewModes: Partial<Record<LibraryViewKey, boolean>>;

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

  /* Scrobbling. Now-playing follows scrobble — if a user opts out of one
   * they opt out of the other; broadcasting "listening now" only to hide
   * the finished listen was never a real user intent. */
  serverScrobbleEnabled: boolean;

  /* Integrations. Deezer has three distinct dimensions (Home shelves,
   * search results, external browse); everything else that used to be a
   * sub-toggle (top tracks, similar artists, album recs, samples, playlist
   * recs) follows deezerDiscoveryEnabled since they're all "should we ask
   * Deezer to fill a discovery surface". */
  deezerDiscoveryEnabled: boolean;
  deezerSearchEnabled: boolean;
  deezerExternalEnabled: boolean;
  musicbrainzExternalEnabled: boolean;

  /* Privacy / behavior opt-outs. */
  queueSyncEnabled: boolean;
  serverNowPlayingShelfEnabled: boolean;
  resumeLongTracksEnabled: boolean;

  /* Home discovery source visibility. Each family (server, ListenBrainz,
   * Deezer) has its own toggle so users choose which shelves appear —
   * Deezer's is the existing deezerDiscoveryEnabled since that setting
   * already governs whether we call Deezer at all. */
  homeServerSectionsEnabled: boolean;
  homeListenbrainzSectionsEnabled: boolean;

  /* Player controls */
  showSleepTimer: boolean;
  showPlaybackSpeed: boolean;
  showJumpButtons: boolean;
  showVolumeSlider: boolean;
  autoplayEnabled: boolean;
  hapticsEnabled: boolean;
  /** Float the tab dock over the content behind a blur instead of having it
   * take layout space. Off by default: it only shows on screens long enough
   * to scroll under the dock, and it costs every list a taller bottom inset. */
  translucentDock: boolean;
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
  listDensity: 'default',
  coverAccentEnabled: true,
  gridColumns: 3,
  gridSpacing: 8,
  isGridView: true,
  libraryViewModes: {},
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

  deezerDiscoveryEnabled: false,
  deezerSearchEnabled: false,
  deezerExternalEnabled: false,
  musicbrainzExternalEnabled: false,

  // Default-on: cross-device continuity and resume are what the user
  // asked for by pausing an audiobook or opening the app on a tablet.
  // Both hide themselves behind a clear settings row when off.
  queueSyncEnabled: true,
  serverNowPlayingShelfEnabled: true,
  resumeLongTracksEnabled: true,

  homeServerSectionsEnabled: true,
  homeListenbrainzSectionsEnabled: true,

  showSleepTimer: true,
  showPlaybackSpeed: false,
  showJumpButtons: false,
  showVolumeSlider: false,
  autoplayEnabled: false,
  hapticsEnabled: true,
  translucentDock: false,
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
    setListDensity(state, action: PayloadAction<ListDensity>) {
      state.listDensity = action.payload;
    },
    setCoverAccentEnabled(state, action: PayloadAction<boolean>) {
      state.coverAccentEnabled = action.payload;
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
    setLibraryViewMode(
      state,
      action: PayloadAction<{ collection: LibraryViewKey; isGridView: boolean }>
    ) {
      state.libraryViewModes = {
        ...state.libraryViewModes,
        [action.payload.collection]: action.payload.isGridView,
      };
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

    setQueueSyncEnabled(state, action: PayloadAction<boolean>) {
      state.queueSyncEnabled = action.payload;
    },
    setServerNowPlayingShelfEnabled(state, action: PayloadAction<boolean>) {
      state.serverNowPlayingShelfEnabled = action.payload;
    },
    setResumeLongTracksEnabled(state, action: PayloadAction<boolean>) {
      state.resumeLongTracksEnabled = action.payload;
    },
    setHomeServerSectionsEnabled(state, action: PayloadAction<boolean>) {
      state.homeServerSectionsEnabled = action.payload;
    },
    setHomeListenbrainzSectionsEnabled(state, action: PayloadAction<boolean>) {
      state.homeListenbrainzSectionsEnabled = action.payload;
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
    setTranslucentDock(state, action: PayloadAction<boolean>) {
      state.translucentDock = action.payload;
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
  setListDensity,
  setCoverAccentEnabled,
  setGridColumns,
  setGridSpacing,
  setIsGridView,
  setLibraryViewMode,
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
  setDeezerDiscoveryEnabled,
  setDeezerSearchEnabled,
  setDeezerExternalEnabled,
  setMusicbrainzExternalEnabled,
  setQueueSyncEnabled,
  setServerNowPlayingShelfEnabled,
  setResumeLongTracksEnabled,
  setHomeServerSectionsEnabled,
  setHomeListenbrainzSectionsEnabled,
  setShowSleepTimer,
  setShowJumpButtons,
  setShowVolumeSlider,
  setHapticsEnabled,
  setTranslucentDock,
  setRespectReducedMotion,
  setShowPlaybackSpeed,
  setAutoplayEnabled,
  setLastSyncedAt,
  setSyncOnAppStart,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
