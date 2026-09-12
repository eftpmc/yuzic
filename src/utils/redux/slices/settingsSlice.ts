import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_LANGUAGE } from '@/constants/languages';
import type { ListDensity, RadiusPreset } from '@/constants/design';
import { clampSpeed, type SpeedProfile } from '@/utils/playback/speedProfile';

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

/**
 * The scrobble targets a server can be routed to. Last.fm-direct is
 * deliberately not modelled here this cut — Last.fm's real API needs a
 * signed session (api_sig), which isn't built yet, so its route only ever
 * takes 'disabled' | 'through-server'. ListenBrainz supports all three,
 * because `api/listenbrainz` already scrobbles it directly with a token.
 */
export type ScrobbleDestinationKind = 'lastfm' | 'listenbrainz';
export type ScrobbleRoute = 'disabled' | 'through-server' | 'direct';

/**
 * One route per destination per server — never both 'through-server' and
 * 'direct' for the same destination, because there is only one field to hold
 * either value. That is what keeps "exactly one route per destination" true
 * by construction rather than by convention.
 *
 * Missing entries (a server that predates this feature) fall back to a
 * default derived from the old `serverScrobbleEnabled` /
 * ListenBrainz-per-server `scrobbleEnabled` booleans — see
 * `selectors/scrobbleRoutingSelectors.ts`. There is deliberately no migration
 * that writes this field on load; a stored route always wins once one exists,
 * and everyone else keeps reading the derived default forever.
 */
export type ScrobbleRoutes = Partial<Record<ScrobbleDestinationKind, ScrobbleRoute>>;

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
  /** Hold downloads until the device is on WiFi. Downloads are the one thing
   *  the app does that can run up a phone bill on its own, and auto-download
   *  runs without anyone asking, so this defaults to on. */
  downloadOnWifiOnly: boolean;

  language: AppLanguage;

  /* Scrobbling. Now-playing follows scrobble — if a user opts out of one
   * they opt out of the other; broadcasting "listening now" only to hide
   * the finished listen was never a real user intent. */
  serverScrobbleEnabled: boolean;

  /**
   * Per-server, per-destination scrobble route — see {@link ScrobbleRoutes}.
   * Keyed by server id, same pattern as `libraryViewModes`. Absent for every
   * server that existed before this field: `scrobbleRoutingSelectors` derives
   * a route from `serverScrobbleEnabled` and ListenBrainz's own
   * `scrobbleEnabled` in that case, so there is nothing to migrate here.
   */
  scrobbleRoutes: Record<string, ScrobbleRoutes>;

  /* Integrations. Deezer has three distinct dimensions (Home shelves,
   * search results, external browse); everything else that used to be a
   * sub-toggle (top tracks, similar artists, album recs, samples, playlist
   * recs) follows deezerDiscoveryEnabled since they're all "should we ask
   * Deezer to fill a discovery surface". */
  deezerDiscoveryEnabled: boolean;
  deezerSearchEnabled: boolean;
  deezerExternalEnabled: boolean;
  musicbrainzExternalEnabled: boolean;
  /**
   * ListenBrainz's public similar-artist graph (Home shelf, artist page).
   * Needs no account, but it is still a third-party service being told which
   * artists this user listens to, so it waits to be asked for like every
   * other external source rather than being on because it happens to be free.
   */
  listenbrainzDiscoveryEnabled: boolean;
  /** Last.fm read-only metadata (similar artists, recommendation seeds). */
  lastfmEnabled: boolean;

  /* Privacy / behavior opt-outs. */
  queueSyncEnabled: boolean;
  serverNowPlayingShelfEnabled: boolean;
  resumeLongTracksEnabled: boolean;

  /* Home discovery source visibility. The server tier gets its own toggle
   * because nothing else governs it; the two external families are steered by
   * the integration settings that decide whether we may call them at all
   * (deezerDiscoveryEnabled, listenbrainzDiscoveryEnabled) rather than by a
   * second switch that could sit on while the first one is off. */
  homeServerSectionsEnabled: boolean;

  /**
   * Lyrics fallback chain, external sources only — server-embedded lyrics
   * are always tried first and are never part of this list (see
   * `features/lyrics/resolveLyrics`).
   *
   * `lyricsExternalSourcesOrder` names every external source the user has
   * touched, in their preferred try-order; `lyricsExternalSourcesEnabled`
   * says which of those are actually on. Both default empty/off — LRCLIB,
   * like every external source, is off until asked for, so a fresh install
   * behaves exactly like before this feature existed (server-only).
   */
  lyricsExternalSourcesOrder: string[];
  lyricsExternalSourcesEnabled: Record<string, boolean>;

  /* Player controls */
  showSleepTimer: boolean;
  showPlaybackSpeed: boolean;
  /**
   * Remembered playback rate per kind of listening — see
   * `utils/playback/speedProfile`. Two entries rather than one because a
   * listener wants one speed for talking and another for music; a single
   * global rate followed you out of a podcast into the next song and reset to
   * 1× on every launch.
   *
   * Partial on purpose: a user upgrading has a settings blob written before
   * this key existed, and every read goes through `speedFor`, which falls
   * back rather than handing the engine an undefined rate.
   */
  playbackSpeeds: Partial<Record<SpeedProfile, number>>;
  showJumpButtons: boolean;
  showVolumeSlider: boolean;
  autoplayEnabled: boolean;
  /**
   * Seconds of overlap between tracks. `0` is off, which is the default —
   * crossfade is a taste, not an improvement, and a player that fades by
   * default is one that has decided for you.
   */
  crossfadeSeconds: number;
  /** Fade through segues too, rather than hard-cutting where they join. */
  crossfadeAlways: boolean;
  /** Per-band gains in dB, in `EQ_FREQUENCIES` order. All zero is flat. */
  equalizerGains: number[];
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
  downloadOnWifiOnly: true,

  language: DEFAULT_LANGUAGE,

  serverScrobbleEnabled: true,
  scrobbleRoutes: {},

  deezerDiscoveryEnabled: false,
  deezerSearchEnabled: false,
  deezerExternalEnabled: false,
  musicbrainzExternalEnabled: false,
  listenbrainzDiscoveryEnabled: false,
  lastfmEnabled: false,

  // Default-on: cross-device continuity and resume are what the user
  // asked for by pausing an audiobook or opening the app on a tablet.
  // Both hide themselves behind a clear settings row when off.
  queueSyncEnabled: true,
  serverNowPlayingShelfEnabled: true,
  resumeLongTracksEnabled: true,

  homeServerSectionsEnabled: true,

  lyricsExternalSourcesOrder: [],
  lyricsExternalSourcesEnabled: {},

  showSleepTimer: true,
  showPlaybackSpeed: false,
  playbackSpeeds: {},
  showJumpButtons: false,
  showVolumeSlider: false,
  autoplayEnabled: false,
  crossfadeSeconds: 0,
  crossfadeAlways: false,
  equalizerGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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
    setDownloadOnWifiOnly(state, action: PayloadAction<boolean>) {
      state.downloadOnWifiOnly = action.payload;
    },

    setLanguage(state, action: PayloadAction<AppLanguage>) {
      state.language = action.payload;
    },

    setServerScrobbleEnabled(state, action: PayloadAction<boolean>) {
      state.serverScrobbleEnabled = action.payload;
    },

    /**
     * Sets exactly one destination's route for one server. A single field per
     * destination is what makes "at most one route" structural rather than
     * something call sites have to remember to enforce — setting 'direct'
     * here already means it isn't 'through-server' any more.
     */
    setScrobbleRoute(
      state,
      action: PayloadAction<{ serverId: string; destination: ScrobbleDestinationKind; route: ScrobbleRoute }>
    ) {
      const { serverId, destination, route } = action.payload;
      if (!state.scrobbleRoutes) state.scrobbleRoutes = {};
      state.scrobbleRoutes[serverId] = {
        ...state.scrobbleRoutes[serverId],
        [destination]: route,
      };
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
    setListenbrainzDiscoveryEnabled(state, action: PayloadAction<boolean>) {
      state.listenbrainzDiscoveryEnabled = action.payload;
    },
    setLastfmEnabled(state, action: PayloadAction<boolean>) {
      state.lastfmEnabled = action.payload;
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

    setLyricsExternalSourceEnabled(
      state,
      action: PayloadAction<{ sourceId: string; enabled: boolean }>
    ) {
      const { sourceId, enabled } = action.payload;
      if (!state.lyricsExternalSourcesEnabled) state.lyricsExternalSourcesEnabled = {};
      state.lyricsExternalSourcesEnabled[sourceId] = enabled;
      // A source enabled for the first time joins the order at the end; one
      // already present keeps its existing position rather than jumping to
      // the back every time it's re-enabled.
      if (!state.lyricsExternalSourcesOrder) state.lyricsExternalSourcesOrder = [];
      if (enabled && !state.lyricsExternalSourcesOrder.includes(sourceId)) {
        state.lyricsExternalSourcesOrder.push(sourceId);
      }
    },
    /** Replaces the whole try-order (drag-to-reorder writes the full array). */
    setLyricsExternalSourcesOrder(state, action: PayloadAction<string[]>) {
      state.lyricsExternalSourcesOrder = action.payload;
    },

    setShowSleepTimer(state, action: PayloadAction<boolean>) {
      state.showSleepTimer = action.payload;
    },
    setShowPlaybackSpeed(state, action: PayloadAction<boolean>) {
      state.showPlaybackSpeed = action.payload;
    },

    /** Remember a rate for one kind of listening. Clamped here so a bad value
     *  cannot reach the engine even if something writes one. */
    setPlaybackSpeedForProfile(
      state,
      action: PayloadAction<{ profile: SpeedProfile; speed: number }>
    ) {
      if (!state.playbackSpeeds) state.playbackSpeeds = {};
      state.playbackSpeeds[action.payload.profile] = clampSpeed(action.payload.speed);
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
    setCrossfadeSeconds(state, action: PayloadAction<number>) {
      state.crossfadeSeconds = action.payload;
    },
    setCrossfadeAlways(state, action: PayloadAction<boolean>) {
      state.crossfadeAlways = action.payload;
    },
    setEqualizerGains(state, action: PayloadAction<number[]>) {
      state.equalizerGains = action.payload;
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
  setDownloadOnWifiOnly,
  setPreferredCodec,
  setLanguage,
  setServerScrobbleEnabled,
  setScrobbleRoute,
  setDeezerDiscoveryEnabled,
  setDeezerSearchEnabled,
  setDeezerExternalEnabled,
  setMusicbrainzExternalEnabled,
  setListenbrainzDiscoveryEnabled,
  setLastfmEnabled,
  setQueueSyncEnabled,
  setServerNowPlayingShelfEnabled,
  setResumeLongTracksEnabled,
  setHomeServerSectionsEnabled,
  setLyricsExternalSourceEnabled,
  setLyricsExternalSourcesOrder,
  setShowSleepTimer,
  setShowJumpButtons,
  setShowVolumeSlider,
  setHapticsEnabled,
  setTranslucentDock,
  setRespectReducedMotion,
  setShowPlaybackSpeed,
  setPlaybackSpeedForProfile,
  setAutoplayEnabled,
  setCrossfadeSeconds,
  setCrossfadeAlways,
  setEqualizerGains,
  setLastSyncedAt,
  setSyncOnAppStart,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
