import { mmkv } from '@/utils/mmkvStorage';
import type { Song } from '@/types';
import type { DownloadedCollectionEntry, DownloadedTrackEntry } from './downloadStore';

const TRACKS_KEY = 'downloads.tracks.v1';
const COLLECTIONS_KEY = 'downloads.collections.v1';
const JOBS_KEY = 'downloads.jobs.v1';
const RESUMABLES_KEY = 'downloads.resumables.v1';

/**
 * Enough to pick a half-finished download back up.
 *
 * This is expo's own `DownloadResumable.savable()` shape, keyed by track. It
 * is what lets an interrupted download continue from the bytes already on
 * disk rather than starting the file again — without it, backgrounding the
 * app during a 40MB track threw those 40MB away.
 */
export type PersistedResumable = {
  trackId: string;
  url: string;
  fileUri: string;
  resumeData?: string;
  /** So a stale entry from a since-changed server can be discarded. */
  savedAt: number;
};

export type PersistedDownloadJob = {
  id: string;
  type: 'track' | 'album' | 'playlist';
  collectionId?: string;
  tracks: Song[];
  createdAt: number;
  updatedAt: number;
  // Failed runs so far; the queue drops the job once this hits its cap.
  attempts?: number;
};

type DownloadsSnapshot = {
  tracks: DownloadedTrackEntry[];
  collections: DownloadedCollectionEntry[];
  jobs: PersistedDownloadJob[];
};

function readJsonArray<T>(key: string): T[] {
  const raw = mmkv.getString(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray<T>(key: string, value: T[]) {
  mmkv.set(key, JSON.stringify(value));
}

export function readDownloadsSnapshot(): DownloadsSnapshot {
  return {
    tracks: readJsonArray<DownloadedTrackEntry>(TRACKS_KEY),
    collections: readJsonArray<DownloadedCollectionEntry>(COLLECTIONS_KEY),
    jobs: readJsonArray<PersistedDownloadJob>(JOBS_KEY),
  };
}

export function writeDownloadedTracks(tracks: DownloadedTrackEntry[]) {
  writeJsonArray(TRACKS_KEY, tracks);
}

export function writeDownloadedCollections(collections: DownloadedCollectionEntry[]) {
  writeJsonArray(COLLECTIONS_KEY, collections);
}

export function writeDownloadJobs(jobs: PersistedDownloadJob[]) {
  writeJsonArray(JOBS_KEY, jobs);
}

export function readResumables(): PersistedResumable[] {
  return readJsonArray<PersistedResumable>(RESUMABLES_KEY);
}

export function writeResumables(resumables: PersistedResumable[]) {
  writeJsonArray(RESUMABLES_KEY, resumables);
}

export function clearDownloadsSnapshot() {
  mmkv.remove(TRACKS_KEY);
  mmkv.remove(COLLECTIONS_KEY);
  mmkv.remove(JOBS_KEY);
  mmkv.remove(RESUMABLES_KEY);
}
