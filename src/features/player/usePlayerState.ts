import { useEffect, useState } from 'react';
import type { MediaItem } from './mediaItem';
import { getBackend } from './activeBackend';

/**
 * The reactive half of the player, which an interface of methods cannot cover.
 *
 * These three hooks are what `PlayingContext` drives its UI from. They exist
 * separately from `PlayerBackend` because the command interface has no
 * business modelling React.
 *
 * This module used to read two players at once and throw one answer away, so
 * that hook call order stayed stable when the backend was swapped at runtime.
 * With one player left there is nothing to reconcile, and the subscription
 * that was kept alive purely to preserve call order is gone with it.
 */

const ZERO = { position: 0, duration: 0, buffered: 0 };

/**
 * Position, duration and buffered.
 *
 * Polls rather than subscribes, and deliberately does not add a progress event
 * to `BackendEvent` — that stays limited to the three things the app reacts
 * to. Polling a synchronous getter fed by the engine's own events is cheap: it
 * reads a field.
 */
export function usePlayerProgress(updateIntervalSeconds = 1) {
  const [progress, setProgress] = useState(ZERO);

  useEffect(() => {
    const backend = getBackend();
    const read = () => setProgress(backend.getProgress());
    read();
    const timer = setInterval(read, updateIntervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [updateIntervalSeconds]);

  return progress;
}

/**
 * Whether audio is actually coming out.
 *
 * Answered from the `playing` field on the state event. That field is optional
 * on `BackendEvent`, and the guard below is the reason: absent means "cannot
 * say", and coercing it to false would stop the button ever showing as
 * playing.
 */
export function usePlayerIsPlaying(): boolean {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return getBackend().addListener(event => {
      if (event.type === 'stateChange' && typeof event.playing === 'boolean') {
        setPlaying(event.playing);
      }
    });
  }, []);

  return playing;
}

/**
 * The track the player considers current.
 *
 * Null while nothing is active, which the app distinguishes from index 0 — see
 * `PlayerBackend`. Re-read on every track change rather than polled, because
 * this only moves when the engine says it does.
 */
export function usePlayerActiveItem(): MediaItem | null {
  const [item, setItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    const backend = getBackend();
    setItem(backend.getActiveMediaItem());
    return backend.addListener(event => {
      if (event.type === 'trackChange') setItem(backend.getActiveMediaItem());
    });
  }, []);

  return item;
}
