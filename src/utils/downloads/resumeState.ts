import type { PersistedResumable } from './localDownloadStore';

/**
 * Bookkeeping for downloads that were interrupted part-way.
 *
 * Kept apart from `DownloadContext` for the same reason the job runner is:
 * the rules about *when* a half-finished file may be picked back up are easy
 * to get subtly wrong, and getting them wrong either throws away good bytes
 * or splices two different files together.
 */

/** How long a half-finished download is worth keeping. Past this the stream
 *  URL has almost certainly expired and the bytes are only taking up room. */
export const RESUMABLE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function upsertResumable(
  list: PersistedResumable[],
  entry: PersistedResumable
): PersistedResumable[] {
  return [...list.filter(item => item.trackId !== entry.trackId), entry];
}

export function removeResumable(
  list: PersistedResumable[],
  trackId: string
): PersistedResumable[] {
  return list.filter(item => item.trackId !== trackId);
}

/**
 * The saved state for this track, if it can still be used.
 *
 * A stream URL carries an auth token and a quality choice, so a download can
 * only continue against the *same* URL it started from. Resuming against a
 * new one would append bytes from a second response onto the first — a file
 * that is the right length and silent in the middle. When anything differs,
 * the answer is to start the track again rather than to repair it.
 */
export function findUsableResumable(
  list: PersistedResumable[],
  trackId: string,
  url: string,
  now: number = Date.now()
): PersistedResumable | null {
  const entry = list.find(item => item.trackId === trackId);
  if (!entry) return null;
  if (entry.url !== url) return null;
  if (!entry.resumeData) return null;
  if (now - entry.savedAt > RESUMABLE_TTL_MS) return null;
  return entry;
}

/** Entries too old to be worth keeping, so their staging files can go too. */
export function expiredResumables(
  list: PersistedResumable[],
  now: number = Date.now()
): PersistedResumable[] {
  return list.filter(entry => now - entry.savedAt > RESUMABLE_TTL_MS);
}

/**
 * The staging files that must survive the pre-pass cleanup.
 *
 * Cleanup deletes every `.part` it finds, which is right for a file no one is
 * coming back for and wrong for one we are holding bytes for on purpose.
 */
export function stagingPathsToKeep(
  list: PersistedResumable[],
  now: number = Date.now()
): Set<string> {
  return new Set(
    list
      .filter(entry => entry.resumeData && now - entry.savedAt <= RESUMABLE_TTL_MS)
      .map(entry => entry.fileUri)
  );
}
