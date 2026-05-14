import { useQuery } from '@tanstack/react-query';
import { ExternalAlbum } from '@/types';
import { QueryKeys } from '@/enums/queryKeys';
import { searchAlbumPreviews } from '@/api/deezer';

/**
 * Fetches 30s Deezer preview URLs for all tracks in an external album.
 * Matches by track_position (1-indexed). Returns a Record<ExternalSong.id, previewUrl>.
 *
 * Uses Record instead of Map so the result survives JSON serialisation in the
 * React Query persistence layer — Maps round-trip as plain objects and fail
 * instanceof checks on restore, permanently disabling playback buttons.
 */
export function useExternalAlbumPreviews(album: ExternalAlbum | null): Record<string, string> {
  const { data } = useQuery({
    queryKey: [QueryKeys.ExternalAlbumPreviews, album?.id],
    enabled: !!album,
    staleTime: 1000 * 60 * 60, // 1 hour — preview URLs are stable
    queryFn: async () => {
      if (!album) return {} as Record<string, string>;

      // Use embedded preview URLs when the album already has them
      const embedded: Record<string, string> = {};
      for (const song of album.songs) {
        if (song.previewUrl) embedded[song.id] = song.previewUrl;
      }
      if (Object.keys(embedded).length > 0) return embedded;

      // Otherwise search Deezer for the album and fetch its track list
      const deezerTracks = await searchAlbumPreviews(album.artist, album.title);
      if (!deezerTracks.length) return {} as Record<string, string>;

      // Build position → preview URL and title → preview URL lookup tables
      const byPosition: Record<number, string> = {};
      const byTitle: Record<string, string> = {};
      for (const track of deezerTracks) {
        if (track.preview) {
          byPosition[track.track_position] = track.preview;
          byTitle[track.title.toLowerCase().trim()] = track.preview;
        }
      }

      // Match each ExternalSong by position first, then fall back to title
      const result: Record<string, string> = {};
      album.songs.forEach((song, index) => {
        const url =
          byPosition[index + 1] ??
          byTitle[song.title.toLowerCase().trim()];
        if (url) result[song.id] = url;
      });

      return result;
    },
  });

  return data ?? {};
}
