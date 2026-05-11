import { useQuery } from '@tanstack/react-query';
import { ExternalAlbum } from '@/types';
import { QueryKeys } from '@/enums/queryKeys';
import { searchAlbumPreviews } from '@/api/deezer';

/**
 * Fetches 30s Deezer preview URLs for all tracks in an external album.
 * Matches by track_position (1-indexed). Returns a Map<ExternalSong.id, previewUrl>.
 */
export function useExternalAlbumPreviews(album: ExternalAlbum | null): Map<string, string> {
  const { data } = useQuery({
    queryKey: [QueryKeys.ExternalAlbumPreviews, album?.id],
    enabled: !!album,
    staleTime: 1000 * 60 * 60, // 1 hour — preview URLs are stable
    queryFn: async () => {
      if (!album) return new Map<string, string>();

      const embedded = new Map<string, string>();
      for (const song of album.songs) {
        if (song.previewUrl) embedded.set(song.id, song.previewUrl);
      }
      if (embedded.size > 0) return embedded;

      const deezerTracks = await searchAlbumPreviews(album.artist, album.title);
      if (!deezerTracks.length) return new Map<string, string>();

      // Build position → preview URL and title → preview URL maps from Deezer
      const byPosition = new Map<number, string>();
      const byTitle = new Map<string, string>();
      for (const track of deezerTracks) {
        if (track.preview) {
          byPosition.set(track.track_position, track.preview);
          byTitle.set(track.title.toLowerCase().trim(), track.preview);
        }
      }

      // Match each ExternalSong by position first, then fall back to title
      const result = new Map<string, string>();
      album.songs.forEach((song, index) => {
        const url =
          byPosition.get(index + 1) ??
          byTitle.get(song.title.toLowerCase().trim());
        if (url) result.set(song.id, url);
      });

      return result;
    },
  });

  return data instanceof Map ? data : new Map();
}
