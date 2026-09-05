import { RootState } from '@/utils/redux/store';
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

export const selectGridSpacing = (state: RootState): number =>
  state.settings.gridSpacing;

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
  state.settings.autoplayEnabled ?? false;

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

export const selectHomeListenbrainzSectionsEnabled = (state: RootState): boolean =>
  state.settings.homeListenbrainzSectionsEnabled ?? true;