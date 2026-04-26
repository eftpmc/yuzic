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

      const deezerTracks = await searchAlbumPreviews(album.artist, album.title);
      if (!deezerTracks.length) return new Map<string, string>();

      // Build position → preview URL map from Deezer
      const byPosition = new Map<number, string>();
      for (const track of deezerTracks) {
        if (track.preview) byPosition.set(track.track_position, track.preview);
      }

      // Match each ExternalSong by its 1-based position in the tracklist
      const result = new Map<string, string>();
      album.songs.forEach((song, index) => {
        const url = byPosition.get(index + 1);
        if (url) result.set(song.id, url);
      });

      return result;
    },
  });

  return data instanceof Map ? data : new Map();
}
