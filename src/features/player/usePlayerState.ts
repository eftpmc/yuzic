import { useEffect, useState, useSyncExternalStore } from 'react';
import { useActiveMediaItem, useIsPlaying, useProgress } from '@rntp/player';
import type { MediaItem } from '@rntp/player';
import { getBackend, getBackendKind, subscribeBackendKind } from './activeBackend';

/**
 * The reactive half of the player, which an interface of methods cannot cover.
 *
 * `PlayingContext` drives its UI from three rntp hooks, and the swap is not
 * complete without equivalents. They are not symmetrical underneath: rntp
 * exposes playing-ness *only* as a hook and has no synchronous getter, while
 * the engine exposes it *only* as an event. So this module is where the two
 * mechanisms are reconciled, and it is the right place for it — the command
 * interface has no business modelling React.
 *
 * **Both sources are read unconditionally, and one result is chosen.** Calling
 * rntp's hooks only when rntp is active would break the rules of hooks the
 * moment the backend changed, because the call order would change with it. So
 * both run and the inactive one is discarded. That costs an rntp subscription
 * while the engine is active, which is the price of being able to flip
 * backends at runtime rather than at launch.
 */

/** Re-render when the backend itself is swapped. */
export function useBackendKind() {
  return useSyncExternalStore(subscribeBackendKind, getBackendKind, getBackendKind);
}

const ZERO = { position: 0, duration: 0, buffered: 0 };

/**
 * Position, duration and buffered.
 *
 * The engine side polls rather than subscribing, mirroring what rntp's own
 * hook does with its interval argument — and deliberately not adding a
 * progress event to `BackendEvent`, which is kept to the three things the app
 * reacts to. Polling a synchronous getter that is fed by the engine's own
 * events is cheap: it reads a field.
 */
export function usePlayerProgress(updateIntervalSeconds = 1) {
  const kind = useBackendKind();
  const rntpProgress = useProgress(updateIntervalSeconds);
  const [engineProgress, setEngineProgress] = useState(ZERO);

  useEffect(() => {
    if (kind !== 'engine') return;
    const backend = getBackend();
    const read = () => setEngineProgress(backend.getProgress());
    read();
    const timer = setInterval(read, updateIntervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [kind, updateIntervalSeconds]);

  return kind === 'engine' ? engineProgress : rntpProgress;
}

/**
 * Whether audio is actually coming out.
 *
 * rntp answers from its own hook. The engine answers from the `playing` field
 * on its state event — the one field `BackendEvent` marks optional precisely
 * because rntp cannot supply it.
 */
export function usePlayerIsPlaying(): boolean {
  const kind = useBackendKind();
  const rntpPlaying = useIsPlaying();
  const [enginePlaying, setEnginePlaying] = useState(false);

  useEffect(() => {
    if (kind !== 'engine') return;
    return getBackend().addListener(event => {
      // Guarded rather than coerced: absent means "cannot say", and treating
      // that as false would stop the button ever showing as playing.
      if (event.type === 'stateChange' && typeof event.playing === 'boolean') {
        setEnginePlaying(event.playing);
      }
    });
  }, [kind]);

  return kind === 'engine' ? enginePlaying : rntpPlaying;
}

/**
 * The track the player considers current.
 *
 * Null while nothing is active, which the app distinguishes from index 0 — see
 * `PlayerBackend`. Re-read on every track change rather than polled, because
 * this only moves when the engine says it does.
 */
export function usePlayerActiveItem(): MediaItem | null {
  const kind = useBackendKind();
  const rntpItem = useActiveMediaItem();
  const [engineItem, setEngineItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    if (kind !== 'engine') return;
    const backend = getBackend();
    setEngineItem(backend.getActiveMediaItem());
    return backend.addListener(event => {
      if (event.type === 'trackChange') setEngineItem(backend.getActiveMediaItem());
    });
  }, [kind]);

  return kind === 'engine' ? engineItem : rntpItem;
}
