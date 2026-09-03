export const EXTERNAL_SOURCE_COVER_SIZE = 48;
export const LETTER_COVER_PALETTE = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#DDA0DD'] as const;

export const ALBUM_RECOMMENDATION_RELATED_LIMIT = 30;
export const ALBUM_RECOMMENDATION_TARGET_ALBUMS = 8;
export const ALBUM_EXTERNAL_HORIZONTAL_PADDING = 16;
export const ALBUM_PLACEHOLDER_ROWS = 8;
export const ARTIST_PLACEHOLDER_ROWS = 6;
export const PLAYLIST_PLACEHOLDER_ROWS = 8;
export const PLAYLIST_LOCAL_RECOMMENDATION_COUNT = 8;
export const PLAYLIST_EXTERNAL_RECOMMENDATION_COUNT = 8;

export const HOME_ALBUM_MIN_COUNT = 8;
export const HOME_ALBUM_MAX_COUNT = 10;
export const HOME_MOST_PLAYED_ALBUM_MIN_COUNT = 4;
export const RECENTLY_PLAYED_HORIZONTAL_PADDING = 12;
export const RECENTLY_PLAYED_GAP = 10;
export const RECENTLY_PLAYED_VISIBLE_ITEMS = 3.2;
export const RECENTLY_PLAYED_MAX_ITEMS = 12;
export const RECENTLY_PLAYED_MIN_ITEMS = 1;
export const HOME_SECTION_EMPTY_HORIZONTAL_PADDING = 12;

export const ARTIST_INITIAL_RELEASE_ROWS = 3;
export { sourceColor } from './design';
import { sourceColor, statusColor } from './design';

/** @deprecated Use `sourceColor.lastfm` from constants/design.ts. */
export const LASTFM_BRAND_COLOR = sourceColor.lastfm;
export const ONBOARDING_QUICK_CONNECT_TIMEOUT_MS = 10 * 60 * 1000;

export const PLAYING_ARTIST_CARD_HEIGHT = 280;
export const PLAYING_ARTIST_TEXT_MIN_HEIGHT = 70;
export const PLAYING_ARTIST_CARD_PADDING = 16;
export const PLAYING_LYRICS_CARD_HEIGHT = 220;
export const PLAYING_LYRICS_CARD_PADDING_VERTICAL = 28;
export const SLEEP_TIMER_STORAGE_KEY = 'sleep_timer_target_ms';
export const SLEEP_TIMER_MAX_SECONDS = 120 * 60;
export const SLEEP_TIMER_INCREMENTS = [5, 15, 30] as const;
export const PLAYLIST_RECOMMENDATION_LOCAL_COUNT = 8;
export const PLAYLIST_RECOMMENDATION_EXTERNAL_COUNT = 8;
export const PLAYING_GRADIENT_CACHE_MAX = 150;

// iOS system-gray for the "off" states so the connected/enabled dots and
// the disconnected/disabled dots read as one language across settings.
const IOS_SYSTEM_GRAY = '#8E8E93';

export const SETTINGS_STATUS_COLORS = {
  connected: statusColor.success,
  enabled: statusColor.success,
  disconnected: IOS_SYSTEM_GRAY,
  disabled: IOS_SYSTEM_GRAY,
} as const;
