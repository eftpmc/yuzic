import { createSlskdClient, type SlskdClient, type SlskdConfig } from '../client';
import {
  selectAlbumDirectory,
  selectTrackFile,
  type SearchFile,
  type SearchResponseItem,
} from './selection';

const SEARCH_TIMEOUT_MS = 15000;
const POLL_MS = 2000;
// Max poll iterations as safety fallback if isComplete never becomes true (~45s)
const MAX_POLL_ITERATIONS = Math.ceil(45000 / POLL_MS);

type SearchStateResponse = {
  id: string;
  isComplete?: boolean;
};

/** Stable reasons a download can fail, so the UI can translate them. */
export type SlskdDownloadErrorCode =
  | 'missing_identity'
  | 'search_failed'
  | 'search_timeout'
  | 'no_matching_release'
  | 'no_matching_track'
  | 'enqueue_failed'
  | 'request_failed';

export type DownloadAlbumResult =
  | { success: true }
  | { success: false; code: SlskdDownloadErrorCode; message: string };

export type DownloadTrackResult = DownloadAlbumResult;

const errorMessages: Record<SlskdDownloadErrorCode, string> = {
  missing_identity: 'Missing album or artist name',
  search_failed: 'Soulseek search failed',
  search_timeout: 'Soulseek search timed out before completing',
  no_matching_release: 'No matching release found on Soulseek',
  no_matching_track: 'No matching track found on Soulseek',
  enqueue_failed: 'Could not queue the download on Soulseek',
  request_failed: 'Could not reach Soulseek',
};

function failure(code: SlskdDownloadErrorCode): DownloadAlbumResult {
  return { success: false, code, message: errorMessages[code] };
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
): Promise<SearchResponseItem[] | { code: SlskdDownloadErrorCode }> {
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
    return { code: 'search_failed' };
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
    return { code: 'search_timeout' };
  }

  const list = await client.request<SearchResponseItem[]>(
    `/searches/${searchId}/responses`
  );
  return Array.isArray(list) ? list : [];
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
    return failure('missing_identity');
  }

  const searchText = `${artistName} ${albumTitle}`.trim();
  const client = createSlskdClient(config);

  try {
    const result = await runSearch(client, searchText);
    if (!Array.isArray(result)) return failure(result.code);

    // Soulseek returns whatever matched loosely, so the chosen directory has to
    // name the album; otherwise this would queue a different release entirely.
    const chosen = selectAlbumDirectory(result, albumTitle, artistName);
    if (!chosen) return failure('no_matching_release');

    try {
      await enqueueFiles(client, chosen.username, chosen.files);
    } catch {
      return failure('enqueue_failed');
    }
    return { success: true };
  } catch {
    // Reaching here means the search itself failed — a bad URL, a dead server,
    // or the request deadline — not a problem with queueing the transfer.
    return failure('request_failed');
  }
}

export async function downloadTrack(
  config: SlskdConfig,
  trackTitle: string,
  artistName: string
): Promise<DownloadTrackResult> {
  if (!trackTitle || !artistName) {
    return failure('missing_identity');
  }

  const searchText = `${artistName} ${trackTitle}`.trim();
  const client = createSlskdClient(config);

  try {
    const result = await runSearch(client, searchText);
    if (!Array.isArray(result)) return failure(result.code);

    const chosen = selectTrackFile(result, trackTitle);
    if (!chosen) return failure('no_matching_track');

    try {
      await enqueueFiles(client, chosen.username, [chosen.file]);
    } catch {
      return failure('enqueue_failed');
    }
    return { success: true };
  } catch {
    return failure('request_failed');
  }
}
