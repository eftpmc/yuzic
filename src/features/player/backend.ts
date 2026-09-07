import type { BrowseCategory } from './browse';
import type { CrossfadeSettings, EqualizerBand } from './audioSettings';
import type { MediaItem } from './mediaItem';

/**
 * The player, as the app talks to it.
 *
 * Taken from what yuzic actually calls — every `TrackPlayer.*` in
 * `PlayingContext`, `SleepTimerCard`, the player settings screen and the
 * CarPlay hook — rather than from anyone's idea of a complete player. If a
 * method is here, something calls it; if something calls it, it is here.
 *
 * yuzic-engine implements this. It was written while `@rntp/player` was still
 * the player, so both could be driven on one device and compared; that is what
 * turned the replacement from a rewrite of ~40 call sites into a swap of one
 * factory function, and the interface is worth keeping now that only one
 * implementation is left.
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

  /**
   * Overlap consecutive tracks, or `null` for none.
   *
   * Not every player can do this — it needs two sources playing at once — so
   * it is the one method here whose absence is a feature being unavailable
   * rather than a platform being incomplete.
   */
  setCrossfade(options: CrossfadeSettings | null): void;

  /** Bands in ascending frequency order. An empty array is flat. */
  setEqualizer(bands: EqualizerBand[]): void;

  // State, answered synchronously.
  //
  // `null` from the two active-item getters means *nothing is active*, which
  // is not index 0 — the app already distinguishes them, falling back to
  // finding the track by id when the player has no opinion yet.
  getProgress(): { position: number; duration: number; buffered: number };
  getQueue(): MediaItem[];
  getActiveMediaItemIndex(): number | null;
  getActiveMediaItem(): MediaItem | null;

  // Sleep timer
  sleepAfterTime(seconds: number, options?: { fadeOutSeconds?: number }): void;
  cancelSleepTimer(): void;

  // Cache
  clearCache(): void;

  /**
   * Publish the tree the car surfaces browse.
   *
   * Best-effort by contract: a car that is not connected has nothing to show,
   * and a failure here must never take the app down with it.
   */
  setBrowseTree(categories: BrowseCategory[]): void;

  /** Returns an unsubscribe function, as every caller here expects. */
  addListener(listener: (event: BackendEvent) => void): () => void;
}

/**
 * The events the app reacts to, which is fewer than either player emits.
 *
 * `PlayingContext` subscribes to exactly three, and what it takes from each is
 * narrower still — the state event is read for one thing, whether the player
 * is buffering. So that is what this carries.
 *
 * **Not playing-ness.** rntp has no "playing" state at all: its `PlaybackState`
 * is idle / ready / buffering / ended / error, and whether audio is coming out
 * is a separate question answered by `useIsPlaying`. Putting a `playing` flag
 * here would mean inventing one on the rntp side and having the two backends
 * disagree about a field the app does not read. Playing-ness belongs to the
 * hooks, where both can answer it honestly.
 */
export type BackendEvent =
  | { type: 'error'; code?: string; message: string }
  | {
      type: 'stateChange';
      buffering: boolean;
      /**
       * Absent when the backend cannot say — which is rntp's honest answer,
       * not an oversight. Consumers must not read absent as `false`; rntp's
       * playing-ness comes from its `useIsPlaying` hook instead, and the
       * player hooks pick whichever source the active backend actually has.
       */
      playing?: boolean;
    }
  | { type: 'trackChange'; index: number };
