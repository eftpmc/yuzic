import { createSlskdClient, type SlskdConfig } from '../client';
import { parseDirectory } from './directoryName';

export interface SlskdQueueRecord {
  id: string;
  /** The peer serving the files; shown when the path reveals no artist. */
  username: string;
  title: string;
  /** Read from the remote path, so empty when its layout reveals no artist. */
  artistName: string;
  state: string;
  size: number;
  sizeleft: number;
  percentComplete: number;
  fileCount: number;
  /** slskd file ids in this grouping — needed to cancel individual transfers. */
  fileIds: string[];
  /**
   * Best-effort peer upload speed for the transfer, in bytes/sec. Averaged over
   * this directory's in-progress files; 0 when nothing is currently downloading.
   */
  averageSpeed: number;
}

type Transfer = {
  username: string;
  directories?: {
    directory?: string;
    files?: {
      id: string;
      filename: string;
      state: string;
      size: number;
      bytesTransferred?: number;
      percentComplete?: number;
      averageSpeed?: number;
    }[];
  }[];
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
      const parsed = parseDirectory(dir);
      let size = 0;
      let sizeleft = 0;
      let hasActive = false;
      let speedSum = 0;
      let speedCount = 0;
      const fileIds: string[] = [];
      for (const f of files) {
        const s = f.size ?? 0;
        const x = f.bytesTransferred ?? 0;
        size += s;
        sizeleft += Math.max(0, s - x);
        const state = (f.state ?? '').toLowerCase();
        if (!state.includes('completed')) hasActive = true;
        // Only in-flight files contribute a speed; a queued file reports 0 and
        // would drag the average toward nothing.
        if (state.includes('inprogress') && (f.averageSpeed ?? 0) > 0) {
          speedSum += f.averageSpeed ?? 0;
          speedCount++;
        }
        if (f.id) fileIds.push(f.id);
      }
      const percent = size > 0 ? Math.round(((size - sizeleft) / size) * 100) : 0;
      out.push({
        id,
        username: t.username,
        title: parsed.albumTitle || basename(dir),
        artistName: parsed.artistName ?? '',
        state: hasActive ? 'Downloading' : 'Completed',
        size,
        sizeleft,
        percentComplete: percent,
        fileCount: files.length,
        fileIds,
        averageSpeed: speedCount > 0 ? Math.round(speedSum / speedCount) : 0,
      });
    }
  }
  return out;
}

export async function fetchQueue(config: SlskdConfig): Promise<SlskdQueueRecord[]> {
  const client = createSlskdClient(config);
  const data = await client.request<Transfer[]>('/transfers/downloads/');
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

/**
 * Cancels every file in a grouped transfer and removes the record from slskd,
 * so a cancelled item disappears rather than sticking around as a paused row.
 * A downloading file is cancelled first with `?remove=false`, then the record
 * is dropped with `?remove=true` — slskd rejects removing a running transfer.
 */
export async function cancelQueueItem(
  config: SlskdConfig,
  record: Pick<SlskdQueueRecord, 'username' | 'fileIds'>
): Promise<void> {
  if (!record.username || record.fileIds.length === 0) return;
  const client = createSlskdClient(config);
  const encodedUser = encodeURIComponent(record.username);
  await Promise.all(
    record.fileIds.map(async (fileId) => {
      const encodedId = encodeURIComponent(fileId);
      try {
        await client.request(
          `/transfers/downloads/${encodedUser}/${encodedId}?remove=false`,
          { method: 'DELETE' }
        );
      } catch {
        // A file that already finished can't be cancelled — proceed to remove.
      }
      await client.request(
        `/transfers/downloads/${encodedUser}/${encodedId}?remove=true`,
        { method: 'DELETE' }
      );
    })
  );
}
