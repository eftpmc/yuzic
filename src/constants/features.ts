export const ALBUM_RECOMMENDATION_RELATED_LIMIT = 30;
export const ALBUM_RECOMMENDATION_TARGET_ALBUMS = 8;
export const ALBUM_EXTERNAL_HORIZONTAL_PADDING = 16;

export { sourceColor } from './design';
import { statusColor } from './design';

export const PLAYING_ARTIST_CARD_HEIGHT = 280;
export const PLAYING_ARTIST_TEXT_MIN_HEIGHT = 70;
export const PLAYING_ARTIST_CARD_PADDING = 16;
export const SLEEP_TIMER_STORAGE_KEY = 'sleep_timer_target_ms';
export const SLEEP_TIMER_MAX_SECONDS = 120 * 60;
export const SLEEP_TIMER_INCREMENTS = [5, 15, 30] as const;
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
