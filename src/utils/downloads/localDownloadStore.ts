import { mmkv } from '@/utils/mmkvStorage';
import type { Song } from '@/types';
import type { DownloadedCollectionEntry, DownloadedTrackEntry } from './downloadStore';

const TRACKS_KEY = 'downloads.tracks.v1';
const COLLECTIONS_KEY = 'downloads.collections.v1';
const JOBS_KEY = 'downloads.jobs.v1';

export type PersistedDownloadJob = {
  id: string;
  type: 'track' | 'album' | 'playlist';
  collectionId?: string;
  tracks: Song[];
  createdAt: number;
  updatedAt: number;
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

export function clearDownloadsSnapshot() {
  mmkv.remove(TRACKS_KEY);
  mmkv.remove(COLLECTIONS_KEY);
  mmkv.remove(JOBS_KEY);
}
