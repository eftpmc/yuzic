import { createSlskdClient, type SlskdClient, type SlskdConfig } from '../client';

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

export type DownloadTrackResult = DownloadAlbumResult;

function ext(path: string): string {
  const i = path.lastIndexOf('.');
  return i < 0 ? '' : path.slice(i + 1).toLowerCase();
}

function basename(path: string): string {
  const normalized = path.replace(/\//g, '\\');
  const i = normalized.lastIndexOf('\\');
  return i < 0 ? normalized : normalized.slice(i + 1);
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/gi, '');
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function randomUuid(): string {
  if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function runSearch(
  client: SlskdClient,
  searchText: string
): Promise<SearchResponseItem[] | { error: string }> {
  const searchBody = {
    id: randomUuid(),
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
    return { error: 'Search failed' };
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
    return { error: 'Search timed out before completing' };
  }

  const list = await client.request<SearchResponseItem[]>(
    `/searches/${searchId}/responses`
  );
  return Array.isArray(list) ? list : [];
}

function playableFiles(response: SearchResponseItem): SearchFile[] {
  return (response.files ?? []).filter((f) => {
    if (f.isLocked) return false;
    return ALLOWED_EXTENSIONS.includes(ext(f.filename ?? ''));
  });
}

async function enqueueFiles(
  client: SlskdClient,
  username: string,
  files: SearchFile[]
): Promise<void> {
  const encoded = encodeURIComponent(username);
  await client.request(`/transfers/downloads/${encoded}`, {
    method: 'POST',
    body: JSON.stringify(files),
  });
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
    const result = await runSearch(client, searchText);
    if (!Array.isArray(result)) {
      return { success: false, message: result.error };
    }

    type DirGroup = { dir: string; files: SearchFile[] };
    type Candidate = {
      username: string;
      hasFreeUploadSlot: boolean;
      dirs: DirGroup[];
    };
    const candidates: Candidate[] = [];

    for (const r of result) {
      const userFiles = playableFiles(r);
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

    await enqueueFiles(client, user.username, chosenDir.files);

    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'slskd download failed';
    return { success: false, message: msg };
  }
}

export async function downloadTrack(
  config: SlskdConfig,
  trackTitle: string,
  artistName: string
): Promise<DownloadTrackResult> {
  if (!trackTitle || !artistName) {
    return { success: false, message: 'Missing track or artist name' };
  }

  const normTitle = normalize(trackTitle);
  if (!normTitle) {
    return { success: false, message: 'Missing track or artist name' };
  }

  const searchText = `${artistName} ${trackTitle}`.trim();
  const client = createSlskdClient(config);

  try {
    const result = await runSearch(client, searchText);
    if (!Array.isArray(result)) {
      return { success: false, message: result.error };
    }

    type Candidate = {
      username: string;
      hasFreeUploadSlot: boolean;
      file: SearchFile;
    };
    const candidates: Candidate[] = [];

    for (const r of result) {
      for (const f of playableFiles(r)) {
        if (!normalize(basename(f.filename ?? '')).includes(normTitle)) continue;
        candidates.push({
          username: r.username,
          hasFreeUploadSlot: r.hasFreeUploadSlot === true,
          file: f,
        });
      }
    }

    if (candidates.length === 0) {
      return {
        success: false,
        message: 'No matching flac/mp3 file found on Soulseek',
      };
    }

    candidates.sort((a, b) => {
      if (a.hasFreeUploadSlot !== b.hasFreeUploadSlot) {
        return a.hasFreeUploadSlot ? -1 : 1;
      }
      const aFlac = ext(a.file.filename) === 'flac' ? 1 : 0;
      const bFlac = ext(b.file.filename) === 'flac' ? 1 : 0;
      if (aFlac !== bFlac) return bFlac - aFlac;
      return (b.file.bitRate ?? 0) - (a.file.bitRate ?? 0);
    });

    const chosen = candidates[0];
    await enqueueFiles(client, chosen.username, [chosen.file]);

    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'slskd download failed';
    return { success: false, message: msg };
  }
}
