import type { MediaItem } from '@rntp/player';

/**
 * The player, as the app talks to it.
 *
 * Taken from what yuzic actually calls — every `TrackPlayer.*` in
 * `PlayingContext`, `SleepTimerCard`, the player settings screen and the
 * CarPlay hook — rather than from anyone's idea of a complete player. If a
 * method is here, something calls it; if something calls it, it is here.
 *
 * Two backends implement this: `@rntp/player` as it is used today, and
 * yuzic-engine. Having the interface at all is what turns replacing the player
 * from a rewrite of ~40 call sites into a choice, and what lets both be driven
 * on one device and compared.
 *
 * **Commands return void, not promises, and that is deliberate.** The call
 * sites are synchronous and treat playback as fire-and-forget — `play()` on a
 * button press, `seekTo()` on a scrub. Making them awaitable would spread
 * `await` through components that have nothing to do while they wait, and an
 * engine that crosses a bridge cannot honour a synchronous *result* anyway.
 * Failures arrive as a `PlaybackError` event, which is where the app already
 * looks for them.
 *
 * The getters, by contrast, must answer immediately: call sites read
 * `Math.floor(getProgress().position)` inline. See `engineBackend` for how a
 * bridged engine manages that.
 */
export interface PlayerBackend {
  // Lifecycle
  setup(): void;
  setCommands(): void;

  // Queue
  setMediaItems(items: MediaItem[], startIndex?: number): void;
  addMediaItems(items: MediaItem[]): void;
  insertMediaItem(index: number, item: MediaItem): void;
  removeMediaItem(index: number): void;
  moveMediaItem(from: number, to: number): void;
  clear(): void;

  // Transport
  play(): void;
  pause(): void;
  stop(): void;
  seekTo(positionSeconds: number): void;
  skipToNext(): void;
  skipToIndex(index: number): void;
  setVolume(volume: number): void;
  setPlaybackSpeed(speed: number): void;
  setRepeatMode(mode: 'off' | 'track' | 'queue'): void;

  // State, answered synchronously
  getProgress(): { position: number; duration: number; buffered: number };
  getQueue(): MediaItem[];
  getActiveMediaItemIndex(): number;
  getActiveMediaItem(): MediaItem | undefined;

  // Sleep timer
  sleepAfterTime(seconds: number, options?: { fadeOutSeconds?: number }): void;
  cancelSleepTimer(): void;

  // Cache
  clearCache(): void;

  /** Returns an unsubscribe function, as every caller here expects. */
  addListener(listener: (event: BackendEvent) => void): () => void;
}

/**
 * The events the app reacts to, which is fewer than either player emits.
 *
 * `PlayingContext` subscribes to exactly three — error, state, track change —
 * and derives everything else from polling the getters. Narrowing to that
 * keeps the two backends from having to agree about events neither is asked
 * about.
 */
export type BackendEvent =
  | { type: 'error'; code?: string; message: string }
  | { type: 'stateChange'; playing: boolean }
  | { type: 'trackChange'; index: number };
