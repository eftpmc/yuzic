import type { Song } from '@/types';
import { getContentKind } from './contentKind';

/**
 * Which playback speed a track should use.
 *
 * Speed is one setting today, held in React state at 1.0 and never persisted,
 * so it does three things a spoken-word listener notices immediately:
 * it resets to 1× on every launch, it follows you out of a podcast into the
 * next song, and it has to be set again for every episode.
 *
 * Splitting it by *profile* rather than by content kind keeps the stored shape
 * small and stable: a listener wants one speed for talking and one for music,
 * not a separate number per kind. A future `audiobook` kind joins `spoken`
 * without changing anything that reads this.
 */
export type SpeedProfile = 'music' | 'spoken';

export function speedProfileFor(song: Song | null | undefined): SpeedProfile {
  return getContentKind(song) === 'podcastEpisode' ? 'spoken' : 'music';
}

/** What each profile starts at before the user has said otherwise. */
export const DEFAULT_SPEEDS: Record<SpeedProfile, number> = {
  music: 1.0,
  spoken: 1.0,
};

/**
 * The engine accepts a wide range, but the useful span for listening is
 * narrower — and a rate the time-pitch unit cannot hold cleanly sounds broken
 * rather than fast.
 */
export const MIN_SPEED = 0.5;
export const MAX_SPEED = 3.0;

export function clampSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return 1.0;
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed));
}

/**
 * The speed to apply for a track, given what the user has chosen per profile.
 *
 * Reads through a fallback rather than off the stored blob directly: a user
 * upgrading has settings written before this key existed, and `undefined`
 * reaching the engine is a rate of NaN — silence with no error, which is the
 * worst way for a setting to be missing.
 */
export function speedFor(
  song: Song | null | undefined,
  speeds: Partial<Record<SpeedProfile, number>> | undefined,
): number {
  const profile = speedProfileFor(song);
  const stored = speeds?.[profile];
  return clampSpeed(typeof stored === 'number' ? stored : DEFAULT_SPEEDS[profile]);
}
