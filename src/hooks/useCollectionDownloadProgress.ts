import { useMemo } from 'react';
import { useDownloadState } from '@/contexts/DownloadContext';

/**
 * Aggregate download progress for a set of tracks in [0, 1]: completed tracks
 * count as 1, in-flight tracks contribute their byte fraction, and tracks
 * whose total size is unknown (transcoded streams report -1) count as 0 until
 * they finish.
 */
export function useCollectionDownloadProgress(trackIds: string[]): number {
  const { isTrackDownloaded, downloadProgress, downloadedTrackCount } = useDownloadState();

  return useMemo(() => {
    // isTrackDownloaded reads a ref and never changes identity, so
    // downloadedTrackCount is depended on to recompute when a track finishes.
    void downloadedTrackCount;

    if (!trackIds.length) return 0;
    let sum = 0;
    for (const trackId of trackIds) {
      if (isTrackDownloaded(trackId)) {
        sum += 1;
      } else {
        const fraction = downloadProgress[trackId];
        if (fraction && fraction > 0) sum += Math.min(fraction, 1);
      }
    }
    return sum / trackIds.length;
  }, [trackIds, isTrackDownloaded, downloadProgress, downloadedTrackCount]);
}
