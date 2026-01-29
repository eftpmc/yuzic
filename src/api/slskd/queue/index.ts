import { createSlskdClient, SlskdConfig } from '../client';

export interface SlskdQueueRecord {
  id: string;
  username: string;
  title: string;
  artistName: string;
  state: string;
  size: number;
  sizeleft: number;
  percentComplete: number;
  fileCount: number;
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

function basename(path: string): string {
  const n = path.replace(/[/\\]+$/, '');
  const i = Math.max(n.lastIndexOf('/'), n.lastIndexOf('\\'));
  return i < 0 ? n : n.slice(i + 1) || n;
}

function groupDownloadsByDirectory(transfers: Transfer[]): SlskdQueueRecord[] {
  const out: SlskdQueueRecord[] = [];
  for (const t of transfers) {
    const dirs = t.directories ?? [];
    for (const d of dirs) {
      const files = d.files ?? [];
      if (files.length === 0) continue;
      const dir = (d.directory ?? '').trim() || 'Unknown';
      const id = `${t.username}::${dir}`;
      let size = 0;
      let sizeleft = 0;
      let hasActive = false;
      for (const f of files) {
        const s = f.size ?? 0;
        const x = f.bytesTransferred ?? 0;
        size += s;
        sizeleft += Math.max(0, s - x);
        if ((f.state ?? '').toLowerCase() !== 'completed') hasActive = true;
      }
      const percent = size > 0 ? Math.round(((size - sizeleft) / size) * 100) : 0;
      out.push({
        id,
        username: t.username,
        title: basename(dir),
        artistName: t.username,
        state: hasActive ? 'Downloading' : 'Completed',
        size,
        sizeleft,
        percentComplete: percent,
        fileCount: files.length,
      });
    }
  }
  return out;
}

export async function fetchQueue(config: SlskdConfig): Promise<SlskdQueueRecord[]> {
  const { request } = createSlskdClient(config);
  const data = await request<Transfer[]>('/transfers/downloads/');
  return groupDownloadsByDirectory(Array.isArray(data) ? data : []);
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
