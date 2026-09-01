import type { DownloadedCollectionEntry } from './downloadStore';
import type { PersistedDownloadJob } from './localDownloadStore';
import {
  doesTrackMatchProviderScope,
  type DownloadProviderScope,
} from './provider';
import type { LocalDownloadedTrackEntry } from './restore';

/**
 * Decisions behind removing downloads: which entries a removal covers, and what
 * the tracks, collections and job queue look like afterwards.
 *
 * Deleting more than the user asked for is silent and unrecoverable — the files
 * are gone — so every rule here is separated from the filesystem work in
 * DownloadContext and checked on its own.
 */

/** Tracks a provider-scoped clear covers. An unresolvable scope matches
 * nothing rather than everything; see doesTrackMatchProviderScope. */
export function tracksInScope(
  tracks: LocalDownloadedTrackEntry[],
  scope?: DownloadProviderScope
): LocalDownloadedTrackEntry[] {
  return tracks.filter(track => doesTrackMatchProviderScope(track, scope));
}

/** Tracks named by a collection removal, narrowed to the scope when given. */
export function tracksInCollectionRemoval(
  tracks: LocalDownloadedTrackEntry[],
  trackIds: string[],
  scope?: DownloadProviderScope
): LocalDownloadedTrackEntry[] {
  const ids = new Set(trackIds);
  return tracks.filter(
    track => ids.has(track.trackId) && doesTrackMatchProviderScope(track, scope)
  );
}

export function tracksWithout(
  tracks: LocalDownloadedTrackEntry[],
  removedTrackIds: Set<string>
): LocalDownloadedTrackEntry[] {
  return tracks.filter(track => !removedTrackIds.has(track.trackId));
}

/**
 * Trims removed tracks out of every collection and drops any left empty.
 *
 * Deliberately decided from the removed track ids alone. An earlier version
 * decided from the scope's resolved serverId, which dropped every collection
 * from every provider whenever the scope couldn't resolve one — for instance
 * on a corrupt "unknown provider" row.
 */
export function collectionsWithoutTracks(
  collections: DownloadedCollectionEntry[],
  removedTrackIds: Set<string>
): DownloadedCollectionEntry[] {
  return collections
    .map(collection => ({
      ...collection,
      trackIds: collection.trackIds.filter(trackId => !removedTrackIds.has(trackId)),
    }))
    .filter(collection => collection.trackIds.length > 0);
}

/** A download id may name a job, the collection it belongs to, or one of its tracks. */
export function jobMatchesDownloadId(job: PersistedDownloadJob, downloadId: string): boolean {
  return (
    job.id === downloadId ||
    job.collectionId === downloadId ||
    job.tracks.some(track => track.id === downloadId)
  );
}

/** Narrower than jobMatchesDownloadId: a collection, never an individual track. */
export function jobMatchesCollectionId(job: PersistedDownloadJob, collectionId: string): boolean {
  return job.collectionId === collectionId || job.id === collectionId;
}

export function trackIdsOfJobs(jobs: PersistedDownloadJob[]): string[] {
  return jobs.flatMap(job => job.tracks.map(track => track.id));
}

/**
 * Keeps a job only while it still holds work outside the cleared scope — a job
 * entirely within it has nothing left to download.
 */
export function jobsOutsideScope(
  jobs: PersistedDownloadJob[],
  scope?: DownloadProviderScope
): PersistedDownloadJob[] {
  return jobs.filter(job =>
    job.tracks.some(track => !doesTrackMatchProviderScope(
      { serverId: track.sourceServerId, serverType: track.sourceServerType },
      scope
    ))
  );
}

/**
 * Of the tracks a removal touched, those whose in-flight download should be
 * cancelled: only ones no remaining job still wants.
 */
export function orphanedTrackIds(
  candidateTrackIds: Iterable<string>,
  remainingJobs: PersistedDownloadJob[]
): string[] {
  const stillQueued = new Set(trackIdsOfJobs(remainingJobs));
  const orphans: string[] = [];
  for (const trackId of candidateTrackIds) {
    if (!stillQueued.has(trackId)) orphans.push(trackId);
  }
  return orphans;
}
