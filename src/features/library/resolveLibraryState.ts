import type { LibraryState } from '@/types/LibraryState';

/**
 * Everything currently known about an entity that its `LibraryState`
 * depends on. Kept deliberately flat and boolean so the resolver stays a
 * pure, synchronous function — no React, no redux, no network — that every
 * consumer (hooks, selectors, tests) can call with facts assembled however
 * suits them.
 */
export interface LibraryStateFacts {
  /** Matched against the synced library index (server or local provider). */
  isInLibrary: boolean;
  /**
   * Present in the Wants store (user declared save-only intent).
   * STUBBED false for now — Phase C wires this up to `wantsSlice`.
   */
  isWanted?: boolean;
  /** At least one enabled acquisition provider (downloader/importer) could get it. */
  hasAcquisitionProvider?: boolean;
  /** Entity came from an external source (externalSource set / libraryState was 'external'). */
  isExternalOrigin?: boolean;
}

/**
 * Resolves the current known facts about an entity to a single `LibraryState`.
 *
 * Precedence (highest wins): in-library > wanted > acquirable > external.
 *
 * - `in-library` — the entity is already owned/present; nothing else matters
 *   once this is true.
 * - `wanted` — not owned, but the user has explicitly declared intent to
 *   acquire it. Wanting outranks mere acquirability because it reflects a
 *   deliberate user decision, not just provider availability.
 * - `acquirable` — not owned, not (yet) wanted, but an enabled acquisition
 *   provider could bring it in on request.
 * - `external` (fallthrough) — nothing above applies. This is the default:
 *   an entity reaches here either because it's genuinely external-origin
 *   with no acquisition path, or because none of the stronger facts were
 *   asserted. A local-origin entity is by definition already in the
 *   library, so callers for those pass `isInLibrary: true` and never reach
 *   this branch — the fallthrough is safe to treat as `external` rather
 *   than defaulting to `in-library`, which would silently claim ownership
 *   of something never confirmed to be owned.
 */
export function resolveLibraryState(facts: LibraryStateFacts): LibraryState {
  if (facts.isInLibrary) return 'in-library';
  if (facts.isWanted) return 'wanted';
  if (facts.hasAcquisitionProvider) return 'acquirable';
  return 'external';
}
