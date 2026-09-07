import type { PlayerBackend } from './backend';
import { createRntpBackend } from './createRntpBackend';
import { createEngineBackend } from './createEngineBackend';

/**
 * Which player the app is actually using.
 *
 * A module-level singleton rather than context, because the transport is
 * reached from callbacks, effects and a CarPlay hook that has no provider
 * above it — and because there is exactly one player. Threading it through
 * React would be ceremony around a global that is genuinely global.
 *
 * **rntp is the default and stays the default.** The engine is opt-in, and
 * only in development: it has never played a note for anyone but us, and a
 * release build that quietly used it would be shipping an experiment.
 */
export type BackendKind = 'rntp' | 'engine';

let kind: BackendKind = 'rntp';
let instance: PlayerBackend | null = null;
const listeners = new Set<(kind: BackendKind) => void>();

export function getBackend(): PlayerBackend {
  if (!instance) instance = kind === 'engine' ? createEngineBackend() : createRntpBackend();
  return instance;
}

export function getBackendKind(): BackendKind {
  return kind;
}

/**
 * Switch players.
 *
 * Stops the outgoing one first: two players holding an audio session at once
 * is the one outcome worse than either being wrong, and the old instance is
 * discarded rather than kept warm — a paused player still owns its session,
 * its notification and its remote commands.
 *
 * The queue is *not* migrated. Rebuilding it in the new player would mean
 * guessing at position, shuffle order and the rest, and the honest result of
 * changing engines mid-session is that playback stops. Callers are expected to
 * do this while nothing is playing, and the dev toggle says so.
 */
export function setBackendKind(next: BackendKind) {
  if (next === kind) return;
  if (instance) {
    try {
      instance.stop();
      instance.clear();
    } catch {
      // A backend that cannot be stopped is being thrown away anyway; failing
      // here would leave the app on neither player.
    }
  }
  kind = next;
  instance = null;
  for (const listener of listeners) listener(kind);
}

/** For the hooks, which have to re-render when the player underneath changes. */
export function subscribeBackendKind(listener: (kind: BackendKind) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test seam: drop the memoized instance so a fresh one is built. */
export function resetBackendForTests() {
  kind = 'rntp';
  instance = null;
  listeners.clear();
}
