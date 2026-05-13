import { useQuery } from '@tanstack/react-query';

import { QueryKeys } from '@/enums/queryKeys';
import { ExternalAlbum } from '@/types';

import * as deezer from '@/api/deezer';

type UseExternalAlbumResult = {
  album: ExternalAlbum | null;
  isLoading: boolean;
  error: Error | null;
};

export function useExternalAlbum(
  albumIdOrInput: string | { source?: 'deezer' | 'musicbrainz' | 'lastfm'; albumId: string; artist?: string; title?: string }
): UseExternalAlbumResult {
  const albumId = typeof albumIdOrInput === 'string' ? albumIdOrInput : albumIdOrInput.albumId;
  const source = typeof albumIdOrInput === 'string' ? undefined : albumIdOrInput.source;
  const artist = typeof albumIdOrInput === 'string' ? undefined : albumIdOrInput.artist;
  const title = typeof albumIdOrInput === 'string' ? undefined : albumIdOrInput.title;

  const query = useQuery<ExternalAlbum | null, Error>({
    queryKey: [QueryKeys.ExternalAlbum, source ?? 'deezer', albumId],
    enabled: !!albumId,
    staleTime: 1000 * 60 * 60 * 24,

    queryFn: async () => {
      if (source === 'deezer') {
        return deezer.getDeezerAlbum(albumId);
      }

      // Try Deezer first when we have enough metadata to resolve it
      if (artist && title) {
        const deezerMatch = await deezer.resolveDeezerAlbum(artist, title);
        if (deezerMatch) {
          const full = await deezer.getDeezerAlbum(deezerMatch.id);
          if (full) return full;
        }
      }

      return null;
    },
  });

  return {
    album: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ?? null,
  };
}
