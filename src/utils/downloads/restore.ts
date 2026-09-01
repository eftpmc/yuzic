import type {
  DownloadedCollectionEntry,
  DownloadedTrackEntry,
} from './downloadStore';
import type { PersistedDownloadJob } from './localDownloadStore';

/**
 * Pure half of restoring downloads at startup.
 *
 * Everything here decides what a persisted snapshot means without touching the
 * filesystem or the store, so the rules that decide whether a user's downloads
 * survive an app update are checkable on their own.
 */

export const DOWNLOAD_SCHEMA_VERSION = 2;
export const STAGING_SUFFIX = '.part';

export type LocalDownloadedTrackEntry = DownloadedTrackEntry & {
  localPath: string;
  schemaVersion?: number;
  title?: string;
  originalTrack?: {
    id?: string;
    extraPayload?: {
      serverId?: string;
      serverType?: string;
      coverKind?: string;
    };
  };
};

export type DownloadSnapshot = {
  tracks: DownloadedTrackEntry[];
  collections: DownloadedCollectionEntry[];
  jobs: PersistedDownloadJob[];
};

export type RestoredDownloadState = {
  tracks: LocalDownloadedTrackEntry[];
  collections: DownloadedCollectionEntry[];
  jobs: PersistedDownloadJob[];
  /** Files belonging to dropped entries, for the caller to delete. */
  stalePaths: string[];
  /** True when the pruned result differs from the snapshot and must be written back. */
  changed: boolean;
};

export function sanitizeFileName(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'track';
}

// Streams transcoded by the music server are always mp3 (see
// qualityToStreamParams), but 'original' quality returns the raw file —
// pick the extension from what the server actually sent.
export function extensionFromContentType(contentType: string | undefined): string {
  const mime = (contentType ?? '').split(';')[0].trim().toLowerCase();
  switch (mime) {
    case 'audio/mpeg':
    case 'audio/mp3':
      return 'mp3';
    case 'audio/flac':
    case 'audio/x-flac':
      return 'flac';
    case 'audio/ogg':
    case 'application/ogg':
      return 'ogg';
    case 'audio/opus':
      return 'opus';
    case 'audio/mp4':
    case 'audio/x-m4a':
      return 'm4a';
    case 'audio/aac':
      return 'aac';
    case 'audio/wav':
    case 'audio/x-wav':
      return 'wav';
    default:
      return 'mp3';
  }
}

export function headerValue(
  headers: Record<string, string> | undefined,
  name: string
): string | undefined {
  if (!headers) return undefined;
  const target = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === target) return headers[key];
  }
  return undefined;
}

export function normalizeLocalUri(uri: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(uri)) return uri;
  return `file://${uri}`;
}

/**
 * Re-roots a stored localPath onto the current document directory so downloads
 * survive an app reinstall or update that rotates the iOS container UUID —
 * without this the paths still look valid but point at a directory that no
 * longer exists, and every download appears to have vanished.
 */
export function rerootLocalPath(storedPath: string, docDir: string | null): string {
  if (!docDir || storedPath.startsWith(docDir)) return storedPath;
  const marker = 'downloads/';
  const idx = storedPath.indexOf(marker);
  if (idx !== -1) return `${docDir}${storedPath.slice(idx)}`;
  return storedPath;
}

/**
 * Whether an entry carries everything playback needs. Entries written before
 * the current schema are re-checked field by field, so one that happens to be
 * complete is kept rather than being discarded for its version alone.
 */
export function hasCurrentDownloadMetadata(track: LocalDownloadedTrackEntry): boolean {
  if (track.schemaVersion === DOWNLOAD_SCHEMA_VERSION) return true;

  const payload = track.originalTrack?.extraPayload;
  return Boolean(
    track.localPath &&
    track.trackId &&
    track.serverId &&
    track.serverType &&
    track.coverKind &&
    payload?.serverId &&
    payload?.serverType &&
    payload?.coverKind
  );
}

/**
 * Prunes a persisted snapshot down to what is still usable: entries missing
 * playback metadata are dropped (their files reported as stale), paths are
 * re-rooted onto the current container, and collections lose references to
 * tracks that no longer exist.
 */
export function restoreDownloadState(
  snapshot: DownloadSnapshot,
  docDir: string | null
): RestoredDownloadState {
  const stalePaths: string[] = [];
  let changed = false;

  const tracks = snapshot.tracks
    .map((track): LocalDownloadedTrackEntry | null => {
      const localTrack = track as LocalDownloadedTrackEntry;
      const localPath = localTrack.localPath;

      if (!localPath) {
        changed = true;
        return null;
      }

      if (!hasCurrentDownloadMetadata(localTrack)) {
        stalePaths.push(rerootLocalPath(localPath, docDir));
        changed = true;
        return null;
      }

      const rerootedPath = rerootLocalPath(localPath, docDir);
      if (rerootedPath !== localPath) changed = true;

      return {
        ...localTrack,
        localPath: rerootedPath,
        schemaVersion: DOWNLOAD_SCHEMA_VERSION,
      };
    })
    .filter((track): track is LocalDownloadedTrackEntry => !!track);

  const validTrackIds = new Set(tracks.map(track => track.trackId));
  const collections = snapshot.collections
    .map(collection => {
      const trackIds = Array.isArray(collection.trackIds) ? collection.trackIds : [];
      const validCollectionTrackIds = trackIds.filter(trackId => validTrackIds.has(trackId));
      if (validCollectionTrackIds.length !== trackIds.length) changed = true;
      return { ...collection, trackIds: validCollectionTrackIds };
    })
    .filter(collection => collection.trackIds.length > 0);

  if (collections.length !== snapshot.collections.length) changed = true;

  const jobs = snapshot.jobs.filter(
    job => Array.isArray(job.tracks) && job.tracks.length > 0
  );

  return { tracks, collections, jobs, stalePaths, changed };
}
