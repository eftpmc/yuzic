import { createLidarrClient } from '../client';
import type { LidarrConfig } from '@/types';

/** Raw queue record from Lidarr API. */
type LidarrQueueRecordRaw = {
  id: number;
  artistId?: number;
  albumId?: number;
  title?: string;
  status?: string;
  trackedDownloadState?: string;
  size?: number;
  sizeleft?: number;
  album?: { title?: string };
  artist?: { artistName?: string };
  statusMessages?: { title: string }[];
};

/** One queue entry per album. Keeps queue minimal. */
export type LidarrQueueRecord = {
  id: string;
  albumId?: number;
  albumTitle: string;
  artistName: string;
  size: number;
  sizeleft: number;
  percentComplete: number;
  trackCount: number;
  status?: string;
  trackedDownloadState?: string;
  statusMessages: { title: string }[];
};

export type LidarrQueueResponse = {
  page: number;
  pageSize: number;
  totalRecords: number;
  records: LidarrQueueRecordRaw[];
};

export type FinishedQueueItem = LidarrQueueRecord;

function groupByAlbum(records: LidarrQueueRecordRaw[]): LidarrQueueRecord[] {
  const byKey = new Map<string, LidarrQueueRecordRaw[]>();
  for (const r of records) {
    const key = r.albumId != null ? `album-${r.albumId}` : `track-${r.id}`;
    const arr = byKey.get(key) ?? [];
    arr.push(r);
    byKey.set(key, arr);
  }
  const out: LidarrQueueRecord[] = [];
  for (const [key, arr] of byKey) {
    const first = arr[0]!;
    const totalSize = arr.reduce((s, r) => s + (r.size ?? 0), 0);
    const sizeleft = arr.reduce((s, r) => s + (r.sizeleft ?? 0), 0);
    const percent = totalSize > 0 ? Math.round(((totalSize - sizeleft) / totalSize) * 100) : 0;
    const albumTitle = first.album?.title || first.title || 'Unknown Album';
    const artistName = first.artist?.artistName || 'Unknown Artist';
    const statusMessages: { title: string }[] = [];
    for (const r of arr) {
      for (const m of r.statusMessages ?? []) {
        if (m?.title) statusMessages.push({ title: m.title });
      }
    }
    out.push({
      id: key,
      albumId: first.albumId,
      albumTitle,
      artistName,
      size: totalSize,
      sizeleft: Math.min(sizeleft, totalSize),
      percentComplete: percent,
      trackCount: arr.length,
      status: first.status,
      trackedDownloadState: first.trackedDownloadState,
      statusMessages,
    });
  }
  return out;
}

export async function fetchQueue(
  config: LidarrConfig
): Promise<LidarrQueueRecord[]> {
  const client = createLidarrClient(config);
  const data = await client.request<LidarrQueueResponse>(
    '/queue?includeAlbum=true&includeArtist=true&pageSize=100'
  );
  const raw = data?.records ?? [];
  return groupByAlbum(raw);
}

export function detectFinishedQueueItems(
  previous: LidarrQueueRecord[],
  current: LidarrQueueRecord[]
): FinishedQueueItem[] {
  if (!previous.length) return [];
  const currentIds = new Set(current.map((item) => item.id));
  return previous.filter((item) => !currentIds.has(item.id));
}

export async function fetchQueueWithDiff(
  config: LidarrConfig,
  previousQueue: LidarrQueueRecord[]
): Promise<{
  currentQueue: LidarrQueueRecord[];
  finishedItems: FinishedQueueItem[];
}> {
  const currentQueue = await fetchQueue(config);
  const finishedItems = detectFinishedQueueItems(previousQueue, currentQueue);
  return { currentQueue, finishedItems };
}
