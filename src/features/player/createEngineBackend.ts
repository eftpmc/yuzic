import type { MediaItem } from '@rntp/player';
import type { PlayerBackend, BackendEvent } from './backend';
import {
  applyEvent,
  createShadow,
  toEngineTrack,
  toRntpProgress,
  type Shadow,
} from './engineBackend';

/**
 * `PlayerBackend`, implemented on yuzic-engine.
 *
 * The engine is loaded lazily and by `require`, for the same reason the smoke
 * test does it: if the native module is missing this throws, and it should
 * surface as a playback error rather than a blank screen at import time.
 *
 * Every command is fired and not awaited. That is not carelessness — the
 * interface promises synchronous calls, the app has nothing to do while a
 * bridge round-trips, and a rejected promise nobody holds becomes an unhandled
 * rejection. So each one is caught and turned into the error event the app
 * already listens for.
 */
/**
 * Reached by `require` rather than `import` so a missing native module
 * surfaces as a playback error at first use, not a blank screen at import.
 * The smoke test does the same, for the same reason.
 */
function requireEngine() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('yuzic-engine') as typeof import('yuzic-engine')).YuzicEngine;
}

export function createEngineBackend(): PlayerBackend {
  let shadow: Shadow = createShadow();
  let listeners: ((event: BackendEvent) => void)[] = [];
  let unsubscribeEngine: (() => void) | null = null;

  // Untyped on purpose: this is the one place that reaches into the native
  // module by name, and typing it against the engine's interface here would
  // only restate what `PlayerBackend` above already promises.
  let engine: ReturnType<typeof requireEngine> | null = null;

  function load() {
    if (!engine) engine = requireEngine();
    return engine;
  }

  function emit(event: BackendEvent) {
    for (const listener of listeners) listener(event);
  }

  /**
   * Run an engine call, and turn a failure into the event the app watches.
   *
   * Named for what it is rather than hidden in every method: the app cannot
   * see a rejected promise, so anything that fails silently here is a track
   * that simply never plays with nothing in the log to say why.
   */
  function fire(what: string, run: () => Promise<unknown>) {
    try {
      const result = run();
      if (result && typeof result.catch === 'function') {
        result.catch((error: unknown) => {
          emit({ type: 'error', code: 'ENGINE_CALL_FAILED', message: `${what}: ${String(error)}` });
        });
      }
    } catch (error) {
      emit({ type: 'error', code: 'ENGINE_CALL_FAILED', message: `${what}: ${String(error)}` });
    }
  }

  /**
   * Queue edits are applied to the shadow immediately as well as sent.
   *
   * `getQueue()` answers synchronously, and a caller that adds a track and
   * reads the queue on the next line has to see it — the engine's own
   * confirmation arrives an event later. The engine remains the authority: a
   * `queueChange` correcting this is welcome, and the shadow is a prediction of
   * a call already made rather than a guess about one that might be.
   */
  function editQueue(next: MediaItem[], activeIndex = shadow.activeIndex) {
    shadow = { ...shadow, queue: next, activeIndex };
  }

  return {
    setup() {
      fire('setup', async () => {
        const api = load();
        await api.setup({ progressIntervalMs: 250 });
        // Subscribe once, and only after setup — the module has no listener
        // list before it exists.
        if (!unsubscribeEngine) {
          unsubscribeEngine = api.addListener((event: Parameters<typeof applyEvent>[1]) => {
            shadow = applyEvent(shadow, event);
            if (event.type === 'stateChange') {
              // Only bufferingness crosses: see BackendEvent for why the two
              // players cannot agree about a "playing" flag.
              emit({ type: 'stateChange', buffering: event.state === 'buffering' });
            }
            if (event.type === 'trackChange') {
              emit({ type: 'trackChange', index: event.index });
            }
            if (event.type === 'error') {
              emit({ type: 'error', code: event.code, message: event.message });
            }
          });
        }
      });
    },

    setCommands() {
      // The engine takes the command list on its own terms; the set yuzic
      // advertises is the same one it gives rntp.
      fire('setCommands', async () =>
        load().setCommands(['playPause', 'next', 'previous', 'seek', 'stop'])
      );
    },

    setMediaItems(items, startIndex = 0) {
      editQueue(items, startIndex);
      fire('setQueue', async () => load().setQueue(items.map(toEngineTrack), startIndex));
    },

    addMediaItems(items) {
      editQueue([...shadow.queue, ...items]);
      fire('append', async () => load().append(items.map(toEngineTrack)));
    },

    insertMediaItem(index, item) {
      const next = [...shadow.queue];
      next.splice(index, 0, item);
      // The active index follows the same rule the engine applies natively:
      // inserting at or before the playhead pushes it down, so the track that
      // is playing keeps playing.
      editQueue(next, index <= shadow.activeIndex ? shadow.activeIndex + 1 : shadow.activeIndex);
      fire('insertAt', async () => load().insertAt(index, [toEngineTrack(item)]));
    },

    removeMediaItem(index) {
      const next = [...shadow.queue];
      next.splice(index, 1);
      editQueue(next, index < shadow.activeIndex ? shadow.activeIndex - 1 : shadow.activeIndex);
      fire('removeAt', async () => load().removeAt(index));
    },

    moveMediaItem(from, to) {
      const next = [...shadow.queue];
      const [moved] = next.splice(from, 1);
      if (moved) next.splice(to, 0, moved);
      let index = shadow.activeIndex;
      if (from === index) index = to;
      else if (from < index && to >= index) index -= 1;
      else if (from > index && to <= index) index += 1;
      editQueue(next, index);
      fire('move', async () => load().move(from, to));
    },

    clear() {
      editQueue([], 0);
      fire('clearQueue', async () => load().clearQueue());
    },

    play() { fire('play', async () => load().play()); },
    pause() { fire('pause', async () => load().pause()); },
    stop() { fire('stop', async () => load().stop()); },
    seekTo(positionSeconds) { fire('seekTo', async () => load().seekTo(positionSeconds)); },
    skipToNext() { fire('skipToNext', async () => load().skipToNext()); },
    skipToIndex(index) { fire('skipToIndex', async () => load().skipToIndex(index)); },
    setVolume(volume) { fire('setVolume', async () => load().setVolume(volume)); },
    setPlaybackSpeed(speed) { fire('setSpeed', async () => load().setSpeed(speed)); },

    setRepeatMode(mode) {
      // The app says off/track/queue; the engine says off/one/all. Same three
      // states, different words, and translating in one place beats teaching
      // either side the other's vocabulary.
      const engineMode = mode === 'track' ? 'one' : mode === 'queue' ? 'all' : 'off';
      fire('setRepeatMode', async () => load().setRepeatMode(engineMode));
    },

    getProgress() { return toRntpProgress(shadow.progress); },
    getQueue() { return shadow.queue; },
    // Null on an empty queue, matching rntp: "nothing is active" and "the
    // first track" are different answers, and the app branches on it.
    getActiveMediaItemIndex() { return shadow.queue.length > 0 ? shadow.activeIndex : null; },
    getActiveMediaItem() { return shadow.queue[shadow.activeIndex] ?? null; },

    sleepAfterTime(seconds) {
      // The engine picks its own fade length and explains why in SleepTimer;
      // the host's fadeOutSeconds is dropped rather than passed to a parameter
      // that does not exist.
      fire('sleepAfter', async () => load().sleepAfter(seconds));
    },
    cancelSleepTimer() { fire('cancelSleep', async () => load().cancelSleep()); },

    clearCache() { fire('clearCache', async () => load().clearCache()); },

    addListener(listener) {
      listeners = [...listeners, listener];
      return () => {
        listeners = listeners.filter(other => other !== listener);
      };
    },
  };
}
