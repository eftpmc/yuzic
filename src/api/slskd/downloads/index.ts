import { createSlskdClient, type SlskdConfig } from '../client';

const ALLOWED_EXTENSIONS = ['flac', 'mp3'];
const SEARCH_TIMEOUT_MS = 15000;
const POLL_MS = 2000;
// Max poll iterations as safety fallback if isComplete never becomes true (~45s)
const MAX_POLL_ITERATIONS = Math.ceil(45000 / POLL_MS);

type SearchStateResponse = {
  id: string;
  isComplete?: boolean;
};

type SearchFile = {
  filename: string;
  size: number;
  code: number;
  isLocked: boolean;
  extension: string;
  bitRate?: number;
  bitDepth?: number;
};

type SearchResponseItem = {
  username: string;
  files: SearchFile[];
  hasFreeUploadSlot?: boolean;
  lockedFileCount?: number;
  queueLength?: number;
};

export type DownloadAlbumResult =
  | { success: true }
  | { success: false; message: string };

function ext(path: string): string {
  const i = path.lastIndexOf('.');
  return i < 0 ? '' : path.slice(i + 1).toLowerCase();
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function downloadAlbum(
  config: SlskdConfig,
  albumTitle: string,
  artistName: string
): Promise<DownloadAlbumResult> {
  if (!albumTitle || !artistName) {
    return { success: false, message: 'Missing album or artist name' };
  }

  const searchText = `${artistName} ${albumTitle}`.trim();
  const client = createSlskdClient(config);

  try {
    const uuid =
      typeof crypto !== 'undefined' && (crypto as any).randomUUID
        ? (crypto as any).randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
    const searchBody = {
      id: uuid,
      searchText,
      fileLimit: 5000,
      filterResponses: true,
      maximumPeerQueueLength: 1000000,
      minimumPeerUploadSpeed: 0,
      minimumResponseFileCount: 1,
      responseLimit: 100,
      searchTimeout: SEARCH_TIMEOUT_MS,
    };

    const searchState = await client.request<{ id: string }>('/searches', {
      method: 'POST',
      body: JSON.stringify(searchBody),
    });

    const searchId = searchState.id;
    if (!searchId) {
      return { success: false, message: 'Search failed' };
    }

    // Poll search state until complete (slskd API reports isComplete when done)
    let isComplete = false;
    for (let i = 0; i < MAX_POLL_ITERATIONS; i++) {
      await delay(POLL_MS);
      const state = await client.request<SearchStateResponse>(
        `/searches/${searchId}`
      );
      if (state.isComplete === true) {
        isComplete = true;
        break;
      }
    }

    if (!isComplete) {
      return {
        success: false,
        message: 'Search timed out before completing',
      };
    }

    const list = await client.request<SearchResponseItem[]>(
      `/searches/${searchId}/responses`
    );
    const responses: SearchResponseItem[] = Array.isArray(list) ? list : [];

    type DirGroup = { dir: string; files: SearchFile[] };
    type Candidate = {
      username: string;
      hasFreeUploadSlot: boolean;
      dirs: DirGroup[];
    };
    const candidates: Candidate[] = [];

    for (const r of responses) {
      const userFiles = (r.files ?? [])
        .filter((f) => {
          if (f.isLocked) return false;
          const e = ext(f.filename ?? '');
          return ALLOWED_EXTENSIONS.includes(e);
        });

      if (userFiles.length === 0) continue;

      const byDir = new Map<string, SearchFile[]>();
      for (const f of userFiles) {
        const path = (f.filename ?? '').replace(/\//g, '\\');
        const last = path.lastIndexOf('\\');
        const dir = last < 0 ? '' : path.slice(0, last);
        const list = byDir.get(dir) ?? [];
        list.push(f);
        byDir.set(dir, list);
      }

      const dirs: DirGroup[] = [];
      byDir.forEach((files, dir) => dirs.push({ dir, files }));

      candidates.push({
        username: r.username,
        hasFreeUploadSlot: r.hasFreeUploadSlot === true,
        dirs,
      });
    }

    if (candidates.length === 0) {
      return {
        success: false,
        message: 'No matching flac/mp3 files found on Soulseek',
      };
    }

    candidates.sort((a, b) => {
      if (a.hasFreeUploadSlot !== b.hasFreeUploadSlot) {
        return a.hasFreeUploadSlot ? -1 : 1;
      }
      const aTotal = a.dirs.reduce((n, d) => n + d.files.length, 0);
      const bTotal = b.dirs.reduce((n, d) => n + d.files.length, 0);
      return bTotal - aTotal;
    });

    const user = candidates[0];
    user.dirs.sort((a, b) => b.files.length - a.files.length);
    const chosenDir = user.dirs[0];
    const toEnqueue = chosenDir.files;

    const encoded = encodeURIComponent(user.username);
    await client.request(`/transfers/downloads/${encoded}`, {
      method: 'POST',
      body: JSON.stringify(toEnqueue),
    });

    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'slskd download failed';
    return { success: false, message: msg };
  }
}
