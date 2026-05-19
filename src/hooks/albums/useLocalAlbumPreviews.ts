import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/enums/queryKeys';
import { ALL_SOURCES } from '@/features/sources/registry';
import { fetchPreviewsForExternalAlbum } from './previewUtils';
import type { Album } from '@/types';

export function useLocalAlbumPreviews({
  album,
  enabled,
}: {
  album: Album | null;
  enabled: boolean;
}): Record<string, string> {
  const { data } = useQuery({
    queryKey: [QueryKeys.LocalAlbumPreviews, album?.id],
    enabled: enabled && !!album,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      if (!album) return {};
      const source = ALL_SOURCES[0];
      const resolved = await source.resolveAlbum(album.artist.name, album.title);
      if (!resolved) return {};
      const external = await source.fetchAlbum(resolved.id);
      if (!external) return {};

      // Re-key the results by local song ID via position matching
      const externalPreviews = await fetchPreviewsForExternalAlbum(external);

      // externalPreviews is keyed by external song IDs — remap by position to local song IDs
      const result: Record<string, string> = {};
      album.songs.forEach((localSong, index) => {
        const externalSong = external.songs[index];
        if (externalSong && externalPreviews[externalSong.id]) {
          result[localSong.id] = externalPreviews[externalSong.id];
        }
      });
      return result;
    },
  });
  return data ?? {};
}
