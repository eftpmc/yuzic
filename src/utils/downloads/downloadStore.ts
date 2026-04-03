export type DownloadedTrackEntry = {
  trackId: string;
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
