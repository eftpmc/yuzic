import { searchAlbumPreviews } from '@/api/deezer';
import type { ExternalAlbum } from '@/types';

/**
 * Fetches 30s preview URLs for all tracks in an external album.
 * Returns Record<songId, previewUrl>.
 * Used by useExternalAlbumPreviews.
 */
export async function fetchPreviewsForExternalAlbum(
  album: ExternalAlbum
): Promise<Record<string, string>> {
  // Use embedded preview URLs when already present
  const embedded: Record<string, string> = {};
  for (const song of album.songs) {
    if (song.previewUrl) embedded[song.id] = song.previewUrl;
  }
  if (Object.keys(embedded).length > 0) return embedded;

  // Search Deezer for the album and match tracks
  const deezerTracks = await searchAlbumPreviews(album.artist, album.title);
  if (!deezerTracks.length) return {};

  const byPosition: Record<number, string> = {};
  const byTitle: Record<string, string> = {};
  for (const track of deezerTracks) {
    if (track.preview) {
      byPosition[track.track_position] = track.preview;
      byTitle[track.title.toLowerCase().trim()] = track.preview;
    }
  }

  const result: Record<string, string> = {};
  album.songs.forEach((song, index) => {
    const url = byPosition[index + 1] ?? byTitle[song.title.toLowerCase().trim()];
    if (url) result[song.id] = url;
  });
  return result;
}
