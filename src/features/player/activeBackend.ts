import type { PlayerBackend } from './backend';
import { createEngineBackend } from './createEngineBackend';

/**
 * The player the app uses.
 *
 * A module-level singleton rather than context, because the transport is
 * reached from callbacks, effects and a CarPlay hook that has no provider
 * above it — and because there is exactly one player. Threading it through
 * React would be ceremony around a global that is genuinely global.
 *
 * This was a two-backend switch while `@rntp/player` was still here. It is a
 * single backend now, and the indirection is kept anyway: `PlayerBackend` is
 * what let the swap happen one file at a time, and it is the seam every test
 * in this directory fakes. A second implementation is not hypothetical either
 * — the engine does not run on web.
 */
export function getBackend(): PlayerBackend {
  if (!instance) instance = createEngineBackend();
  return instance;
}

let instance: PlayerBackend | null = null;

/** Test seam: drop the memoized instance so a fresh one is built. */
export function resetBackendForTests() {
  instance = null;
}
