import { RootState } from '@/utils/redux/store';
import {
  AudioQuality,
  PreferredCodec,
  LibrarySortOrder,
  ThemeMode,
  SearchScope,
  AppLanguage
} from '@/utils/redux/slices/settingsSlice';

export const selectSettings = (state: RootState) => state.settings;

export const selectThemeMode = (state: RootState): ThemeMode =>
  state.settings.themeMode;

export const selectThemeColor = (state: RootState): string =>
  state.settings.themeColor;

export const selectGridColumns = (state: RootState): number =>
  state.settings.gridColumns;

export const selectGridSpacing = (state: RootState): number =>
  state.settings.gridSpacing;

export const selectIsGridView = (state: RootState): boolean =>
  state.settings.isGridView;

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

export const selectAudioQuality = (
  state: RootState
): AudioQuality =>
  state.settings.audioQuality;

export const selectShowQualityBadge = (state: RootState): boolean =>
  state.settings.showQualityBadge ?? false;

export const selectShowSleepTimer = (state: RootState): boolean =>
  state.settings.showSleepTimer ?? true;

export const selectShowPlaybackSpeed = (state: RootState): boolean =>
  state.settings.showPlaybackSpeed ?? true;

export const selectShowSourceHeaders = (state: RootState): boolean =>
  state.settings.showSourceHeaders ?? true;

export const selectPreferredCodec = (state: RootState): PreferredCodec =>
  state.settings.preferredCodec ?? 'mp3';

export const selectWifiStreamQuality = (state: RootState): AudioQuality =>
  state.settings.wifiStreamQuality ?? 'original';

export const selectCellularStreamQuality = (state: RootState): AudioQuality =>
  state.settings.cellularStreamQuality ?? 'high';

export const selectServerScrobbleEnabled = (state: RootState): boolean =>
  state.settings.serverScrobbleEnabled ?? true;

export const selectServerNowPlayingEnabled = (state: RootState): boolean =>
  state.settings.serverNowPlayingEnabled ?? true;

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


export const selectDeezerTopTracksEnabled = (state: RootState): boolean =>
  state.settings.deezerTopTracksEnabled ?? false;

export const selectDeezerSimilarArtistsEnabled = (state: RootState): boolean =>
  state.settings.deezerSimilarArtistsEnabled ?? false;


export const selectDeezerAlbumRecommendationsEnabled = (state: RootState): boolean =>
  state.settings.deezerAlbumRecommendationsEnabled ?? false;

export const selectDeezerSamplesEnabled = (state: RootState): boolean =>
  state.settings.deezerSamplesEnabled ?? false;

export const selectDeezerPlaylistRecommendationsEnabled = (state: RootState): boolean =>
  state.settings.deezerPlaylistRecommendationsEnabled ?? false;

export const selectAnyDeezerEnabled = (state: RootState): boolean =>
  (state.settings.deezerDiscoveryEnabled ||
    state.settings.deezerSearchEnabled ||
    state.settings.deezerExternalEnabled ||
    state.settings.deezerTopTracksEnabled ||
    state.settings.deezerSimilarArtistsEnabled) ?? false;