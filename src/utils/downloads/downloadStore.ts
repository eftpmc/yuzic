import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY = 'yuzic_downloads_v1';

export type DownloadedTrackEntry = {
  trackId: string;
  localPath: string;
  fileSize: number;
  downloadedAt: number;
  albumId: string;
  artistId: string;
  serverId: string;
  serverType: string;
  coverKind: string;
};

export type DownloadedCollectionEntry = {
  id: string;
  type: 'album' | 'playlist';
  trackIds: string[];
  downloadedAt: number;
};

export type PersistedDownloadStore = {
  tracks: Record<string, DownloadedTrackEntry>;
  collections: Record<string, DownloadedCollectionEntry>;
};

export async function loadStore(): Promise<PersistedDownloadStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { tracks: {}, collections: {} };
    return JSON.parse(raw) as PersistedDownloadStore;
  } catch {
    return { tracks: {}, collections: {} };
  }
}

export async function saveStore(store: PersistedDownloadStore): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

const MIME_TO_EXT: Record<string, string> = {
  'audio/flac': '.flac',
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/aac': '.aac',
  'audio/ogg': '.ogg',
  'audio/opus': '.opus',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/wav': '.wav',
  'audio/webm': '.webm',
};

export function mimeTypeToExt(mimeType?: string | null): string {
  if (!mimeType) return '.mp3';
  return MIME_TO_EXT[mimeType.toLowerCase().split(';')[0].trim()] ?? '.mp3';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIdx = 0;
  while (value >= 1024 && unitIdx < units.length - 1) {
    value /= 1024;
    unitIdx++;
  }
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unitIdx]}`;
}
