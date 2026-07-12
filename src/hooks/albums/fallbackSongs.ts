import type { Song, SongBase } from '@/types';

// Reconstructs an album's track list from the synced library tracks when the
// server can't be asked (offline or unreachable). The results carry an empty
// streamUrl — PlayingContext.resolvePlayableSong rebuilds the URL at play
// time, preferring a downloaded local path, so these rows are fully playable
// for downloaded content and recover automatically once the server is back.
export function buildFallbackAlbumSongs(tracks: SongBase[], albumId: string): Song[] {
  if (!albumId) return [];
  return tracks
    .filter(t => t.albumId === albumId)
    .sort((a, b) => {
      const discA = a.disc ?? 1;
      const discB = b.disc ?? 1;
      if (discA !== discB) return discA - discB;
      const trackA = a.trackNumber ?? Number.MAX_SAFE_INTEGER;
      const trackB = b.trackNumber ?? Number.MAX_SAFE_INTEGER;
      return trackA - trackB;
    })
    .map(t => ({ ...t, streamUrl: '' }));
}
