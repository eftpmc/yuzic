export function downloadProgressFraction(written: number, expected: number): number {
  return expected > 0 ? Math.min(written / expected, 1) : -1;
}

export function nextDownloadingIds(
  current: Set<string>,
  trackId: string,
  downloading: boolean,
): Set<string> {
  const next = new Set(current);
  if (downloading) next.add(trackId);
  else next.delete(trackId);
  return next;
}

export function collectionDownloadState(
  trackIds: string[],
  downloadedIds: Set<string>,
  downloadingIds: Set<string>,
  queuedIds: Set<string>,
): { isDownloaded: boolean; isDownloading: boolean } {
  if (!trackIds.length) return { isDownloaded: false, isDownloading: false };
  return {
    isDownloaded: trackIds.every(id => downloadedIds.has(id)),
    isDownloading: trackIds.some(id => downloadingIds.has(id) || queuedIds.has(id)),
  };
}
