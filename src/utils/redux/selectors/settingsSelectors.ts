import { RootState } from '@/utils/redux/store';
import type { CrossfadeSettings } from '@/features/player/audioSettings';
import { FLAT_EQ } from '@/features/player/audioSettings';
import {
  AudioQuality,
  PreferredCodec,
  LibrarySortOrder,
  ThemeMode,
  SearchScope,
  AppLanguage,
  LibraryViewKey,
  LIBRARY_VIEW_DEFAULTS,
} from '@/utils/redux/slices/settingsSlice';
import type { ListDensity, RadiusPreset } from '@/constants/design';
import type { SpeedProfile } from '@/utils/playback/speedProfile';

export const selectSettings = (state: RootState) => state.settings;

export const selectThemeMode = (state: RootState): ThemeMode =>
  state.settings.themeMode;

export const selectThemeColor = (state: RootState): string =>
  state.settings.themeColor;

export const selectRadiusPreset = (state: RootState): RadiusPreset =>
  (state.settings.radiusPreset as RadiusPreset | undefined) ?? 'default';

/** Falls back rather than reading straight through, because a user upgrading
 *  has a persisted settings object written before this key existed. */
export const selectListDensity = (state: RootState): ListDensity =>
  (state.settings.listDensity as ListDensity | undefined) ?? 'default';

export const selectCoverAccentEnabled = (state: RootState): boolean =>
  state.settings.coverAccentEnabled ?? true;

export const selectGridColumns = (state: RootState): number =>
  state.settings.gridColumns;

export const selectIsGridView = (state: RootState): boolean =>
  state.settings.isGridView;

/**
 * Grid or list for one collection.
 *
 * Three tiers, most specific first: what the user chose for *this* collection,
 * then what the kind defaults to, then the old global flag — which is still
 * the answer for a caller with no collection to name.
 */
export const selectLibraryViewMode =
  (collection: LibraryViewKey | null) =>
  (state: RootState): boolean => {
    if (!collection) return state.settings.isGridView;
    return (
      state.settings.libraryViewModes?.[collection] ??
      LIBRARY_VIEW_DEFAULTS[collection]
    );
  };

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

export const selectLanguage = (
  state: RootState
): AppLanguage =>
  state.settings.language;

export const selectHasSeenGetStarted = (
  state: RootState
): boolean =>
  state.settings.hasSeenGetStarted;

export const selectOnboardingDiscoveryPrompted = (
  state: RootState
): boolean =>
  state.settings.onboardingDiscoveryPrompted ?? false;

export const selectShowQualityBadge = (state: RootState): boolean =>
  state.settings.showQualityBadge ?? false;

export const selectShowSleepTimer = (state: RootState): boolean =>
  state.settings.showSleepTimer ?? true;

export const selectShowPlaybackSpeed = (state: RootState): boolean =>
  state.settings.showPlaybackSpeed ?? true;

export const selectShowJumpButtons = (state: RootState): boolean =>
  state.settings.showJumpButtons ?? false;

export const selectShowVolumeSlider = (state: RootState): boolean =>
  state.settings.showVolumeSlider ?? false;

export const selectHapticsEnabled = (state: RootState): boolean =>
  state.settings.hapticsEnabled ?? true;

export const selectRespectReducedMotion = (state: RootState): boolean =>
  state.settings.respectReducedMotion ?? true;

export const selectTranslucentDock = (state: RootState): boolean =>
  state.settings.translucentDock ?? false;

export const selectAutoplayEnabled = (state: RootState): boolean =>
  state.settings.autoplayEnabled ?? true;

export const selectShowSourceHeaders = (state: RootState): boolean =>
  state.settings.showSourceHeaders ?? true;

export const selectPreferredCodec = (state: RootState): PreferredCodec =>
  state.settings.preferredCodec ?? 'mp3';

export const selectWifiStreamQuality = (state: RootState): AudioQuality =>
  state.settings.wifiStreamQuality ?? 'original';

export const selectCellularStreamQuality = (state: RootState): AudioQuality =>
  state.settings.cellularStreamQuality ?? 'high';

export const selectDownloadQuality = (state: RootState): AudioQuality =>
  state.settings.downloadQuality ?? 'high';

export const selectAutoDownloadNewSongs = (state: RootState): boolean =>
  state.settings.autoDownloadNewSongs ?? false;

export const selectDownloadOnWifiOnly = (state: RootState): boolean =>
  state.settings.downloadOnWifiOnly ?? true;

export const selectServerScrobbleEnabled = (state: RootState): boolean =>
  state.settings.serverScrobbleEnabled ?? true;

export const selectLastSyncedAt = (state: RootState): number | null =>
  state.settings.lastSyncedAt;

export const selectSyncOnAppStart = (state: RootState): boolean =>
  state.settings.syncOnAppStart ?? false;

export const selectDeezerDiscoveryEnabled = (state: RootState): boolean =>
  state.settings.deezerDiscoveryEnabled ?? false;

export const selectDeezerSearchEnabled = (state: RootState): boolean =>
  state.settings.deezerSearchEnabled ?? false;

export const selectDeezerExternalEnabled = (state: RootState): boolean =>
  state.settings.deezerExternalEnabled ?? false;

export const selectMusicbrainzExternalEnabled = (state: RootState): boolean =>
  state.settings.musicbrainzExternalEnabled ?? false;

/**
 * Whether one source is enabled for the Search screen's "Other sources"
 * scope. `searchSourcesEnabled` is the unified map; Deezer additionally
 * falls back to the older `deezerSearchEnabled` flag when it has no entry of
 * its own, so a user who already turned Deezer search on before this map
 * existed keeps seeing it on — read-time reconciliation, no migration.
 */
export const selectSearchSourceEnabled = (sourceId: string) =>
  (state: RootState): boolean => {
    const explicit = state.settings.searchSourcesEnabled?.[sourceId];
    if (explicit !== undefined) return explicit;
    if (sourceId === 'deezer') return state.settings.deezerSearchEnabled ?? false;
    return false;
  };

/** Every source id enabled for Search, independent of Home/discovery. */
export const selectEnabledSearchSourceIds = (state: RootState): string[] => {
  const ids = new Set<string>(['deezer', 'musicbrainz']);
  return [...ids].filter(id => selectSearchSourceEnabled(id)(state));
};

/** Off until asked for: see the note on the field in settingsSlice. */
export const selectListenbrainzDiscoveryEnabled = (state: RootState): boolean =>
  state.settings.listenbrainzDiscoveryEnabled ?? false;

export const selectLastfmEnabled = (state: RootState): boolean =>
  state.settings.lastfmEnabled ?? false;


export const selectAnyDeezerEnabled = (state: RootState): boolean =>
  (state.settings.deezerDiscoveryEnabled ||
    state.settings.deezerSearchEnabled ||
    state.settings.deezerExternalEnabled) ?? false;

export const selectQueueSyncEnabled = (state: RootState): boolean =>
  state.settings.queueSyncEnabled ?? true;

export const selectServerNowPlayingShelfEnabled = (state: RootState): boolean =>
  state.settings.serverNowPlayingShelfEnabled ?? true;

export const selectResumeLongTracksEnabled = (state: RootState): boolean =>
  state.settings.resumeLongTracksEnabled ?? true;

export const selectHomeServerSectionsEnabled = (state: RootState): boolean =>
  state.settings.homeServerSectionsEnabled ?? true;

/**
 * Enabled external lyric sources, in the user's try-order.
 *
 * Filters `lyricsExternalSourcesOrder` down to the ones actually enabled
 * rather than trusting the order list alone, so a source that was disabled
 * without being removed from the order (or an id from a future version this
 * one doesn't recognise) never gets called. Empty by default — the whole
 * point being that a fresh install/upgrade resolves lyrics server-only,
 * with no external calls at all, until the user opts in.
 */
export const selectEnabledLyricsExternalSourcesInOrder = (state: RootState): string[] => {
  const order = state.settings.lyricsExternalSourcesOrder ?? [];
  const enabled = state.settings.lyricsExternalSourcesEnabled ?? {};
  return order.filter(sourceId => enabled[sourceId]);
};

export const selectLyricsExternalSourcesOrder = (state: RootState): string[] =>
  state.settings.lyricsExternalSourcesOrder ?? [];

export const selectLyricsExternalSourceEnabled = (sourceId: string) =>
  (state: RootState): boolean => state.settings.lyricsExternalSourcesEnabled?.[sourceId] ?? false;

/**
 * `metadata.enrich` selectors — same shape as the lyrics pair above, kept as
 * two entirely independent chains (artist-info, artwork) per the D3 design.
 */
export const selectEnabledMetadataArtistInfoSourcesInOrder = (state: RootState): string[] => {
  const order = state.settings.metadataArtistInfoOrder ?? [];
  const enabled = state.settings.metadataArtistInfoEnabled ?? {};
  return order.filter(sourceId => enabled[sourceId]);
};

export const selectMetadataArtistInfoOrder = (state: RootState): string[] =>
  state.settings.metadataArtistInfoOrder ?? [];

export const selectMetadataArtistInfoSourceEnabled = (sourceId: string) =>
  (state: RootState): boolean => state.settings.metadataArtistInfoEnabled?.[sourceId] ?? false;

export const selectEnabledMetadataArtworkSourcesInOrder = (state: RootState): string[] => {
  const order = state.settings.metadataArtworkOrder ?? [];
  const enabled = state.settings.metadataArtworkEnabled ?? {};
  return order.filter(sourceId => enabled[sourceId]);
};

export const selectMetadataArtworkOrder = (state: RootState): string[] =>
  state.settings.metadataArtworkOrder ?? [];

export const selectMetadataArtworkSourceEnabled = (sourceId: string) =>
  (state: RootState): boolean => state.settings.metadataArtworkEnabled?.[sourceId] ?? false;

/**
 * Crossfade, as the engine wants it, or `null` when it is off.
 *
 * Zero seconds is off rather than a zero-length fade: `null` tells the engine
 * not to overlap at all, which lets it leave the second voice idle instead of
 * running a fade that does nothing.
 */
export const selectCrossfade = (state: RootState): CrossfadeSettings | null => {
  const durationSec = state.settings.crossfadeSeconds ?? 0;
  if (durationSec <= 0) return null;
  return {
    durationSec,
    mode: state.settings.crossfadeAlways ? 'always' : 'gapless-aware',
    // Not offered as a setting. A skip that fades feels broken rather than
    // smooth, and the engine still applies a short ramp so it cannot click.
    skipIsImmediate: true,
  };
};

export const selectCrossfadeSeconds = (state: RootState): number =>
  state.settings.crossfadeSeconds ?? 0;

export const selectCrossfadeAlways = (state: RootState): boolean =>
  state.settings.crossfadeAlways ?? false;

/**
 * A module constant, not a fresh array.
 *
 * This is read by `useSelector`, which compares by reference — returning
 * `FLAT_EQ.map(...)` would hand back a new array on every render, re-run the
 * effect that pushes the EQ to the engine, and re-render forever.
 */
const FLAT_GAINS: number[] = FLAT_EQ.map(band => band.gainDb);

export const selectEqualizerGains = (state: RootState): number[] =>
  state.settings.equalizerGains ?? FLAT_GAINS;

/**
 * Remembered rates per kind of listening. Read through `speedFor`, never
 * straight off this — a user upgrading has a blob written before the key
 * existed, and an undefined rate reaching the engine is silence.
 */
export const selectPlaybackSpeeds = (state: RootState): Partial<Record<SpeedProfile, number>> =>
  state.settings.playbackSpeeds ?? {};
