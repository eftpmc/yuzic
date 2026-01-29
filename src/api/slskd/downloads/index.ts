import { createSlskdClient, SlskdConfig } from '../client';

const ALLOWED_EXTENSIONS = ['flac', 'mp3'];
const SEARCH_RETRY = 5;
const POLL_MS = 2000;

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
  const { request } = createSlskdClient(config);

  try {
    const uuid =
      typeof crypto !== 'undefined' && (crypto as any).randomUUID
        ? (crypto as any).randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const searchBody = {
      id: uuid,
      searchText,
      fileLimit: 5000,
      filterResponses: true,
      responseLimit: 100,
      searchTimeout: 15000,
    };

    const searchState = await request<{ id: string }>('/searches', {
      method: 'POST',
      body: JSON.stringify(searchBody),
    });

    const searchId = searchState.id;
    if (!searchId) {
      return { success: false, message: 'Search failed' };
    }

    let responses: SearchResponseItem[] = [];
    for (let i = 0; i < SEARCH_RETRY; i++) {
      await delay(POLL_MS);
      const list = await request<SearchResponseItem[]>(
        `/searches/${searchId}/responses`
      );
      responses = Array.isArray(list) ? list : [];
      if (responses.length > 0) break;
    }

    const toEnqueue: { username: string; files: SearchFile[] }[] = [];
    const seen = new Set<string>();

    for (const r of responses) {
      const userFiles = (r.files ?? []).filter((f) => {
        const e = ext(f.filename ?? '');
        if (!ALLOWED_EXTENSIONS.includes(e)) return false;
        const key = `${r.username}:${(f.filename ?? '').toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (userFiles.length > 0) {
        toEnqueue.push({ username: r.username, files: userFiles });
      }
    }

    if (toEnqueue.length === 0) {
      return {
        success: false,
        message: 'No matching flac/mp3 files found on Soulseek',
      };
    }

    for (const { username, files } of toEnqueue) {
      const encoded = encodeURIComponent(username);
      await request(`/transfers/downloads/${encoded}`, {
        method: 'POST',
        body: JSON.stringify(files),
      });
    }

    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'slskd download failed';
    return { success: false, message: msg };
  }
}
