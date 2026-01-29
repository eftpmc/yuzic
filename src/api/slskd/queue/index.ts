import { createSlskdClient, SlskdConfig } from '../client';

/** Flattened download item for UI, compatible with queue diff logic. */
export interface SlskdQueueRecord {
  id: string;
  username: string;
  filename: string;
  state: string;
  size: number;
  sizeleft: number;
  percentComplete: number;
  /** For UI: display as "title" */
  title?: string;
  /** For UI: display as "artist" */
  artistName?: string;
}

type Transfer = {
  username: string;
  directories?: Array<{
    directory?: string;
    files?: Array<{
      id: string;
      filename: string;
      state: string;
      size: number;
      bytesTransferred?: number;
      percentComplete?: number;
    }>;
  }>;
};

function flattenDownloads(transfers: Transfer[]): SlskdQueueRecord[] {
  const out: SlskdQueueRecord[] = [];
  for (const t of transfers) {
    const dirs = t.directories ?? [];
    for (const d of dirs) {
      const files = d.files ?? [];
      for (const f of files) {
        const size = f.size ?? 0;
        const transferred = f.bytesTransferred ?? 0;
        const sizeleft = Math.max(0, size - transferred);
        out.push({
          id: `${t.username}:${f.id}`,
          username: t.username,
          filename: f.filename ?? '',
          state: f.state ?? 'unknown',
          size,
          sizeleft,
          percentComplete: f.percentComplete ?? (size ? (transferred / size) * 100 : 0),
          title: f.filename,
          artistName: t.username,
        });
      }
    }
  }
  return out;
}

export async function fetchQueue(config: SlskdConfig): Promise<SlskdQueueRecord[]> {
  const { request } = createSlskdClient(config);
  const data = await request<Transfer[]>('/transfers/downloads/');
  return flattenDownloads(Array.isArray(data) ? data : []);
}

export function detectFinishedQueueItems(
  previous: SlskdQueueRecord[],
  current: SlskdQueueRecord[]
): SlskdQueueRecord[] {
  if (!previous.length) return [];
  const currentIds = new Set(current.map((item) => item.id));
  return previous.filter((item) => !currentIds.has(item.id));
}

export async function fetchQueueWithDiff(
  config: SlskdConfig,
  previousQueue: SlskdQueueRecord[]
): Promise<{
  currentQueue: SlskdQueueRecord[];
  finishedItems: SlskdQueueRecord[];
}> {
  const currentQueue = await fetchQueue(config);
  const finishedItems = detectFinishedQueueItems(previousQueue, currentQueue);
  return { currentQueue, finishedItems };
}
