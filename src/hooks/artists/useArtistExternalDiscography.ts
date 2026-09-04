import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/enums/queryKeys';
import { useEnabledExternalSources } from '@/features/sources/registry';
import type { ExternalAlbumBase } from '@/types';

export type ArtistExternalDiscography = {
  albums: ExternalAlbumBase[];
  singles: ExternalAlbumBase[];
};

const DISCOGRAPHY_LIMIT = 80;

// Built on SourceDefinition.fetchArtistAlbums (Deezer + MusicBrainz both
// implement it) resolved across every enabled source, rather than
// useArtistTopTracks — that hook is hardcoded to Deezer only and would give
// MusicBrainz-only users a silently-incomplete discography.
export function useArtistExternalDiscography(
  artistName: string | null,
  enabled: boolean
) {
  const enabledSources = useEnabledExternalSources();
  const sourceIds = enabledSources.map(s => s.id).join(',');

  return useQuery<ArtistExternalDiscography>({
    queryKey: [QueryKeys.LocalArtistExternalDiscography, artistName, sourceIds],
    enabled: enabled && !!artistName && enabledSources.length > 0,
    staleTime: 1000 * 60 * 60 * 24,
    queryFn: async (): Promise<ArtistExternalDiscography> => {
      const perSource = await Promise.all(
        enabledSources.map(async (source): Promise<ExternalAlbumBase[]> => {
          const resolved = await source.resolveArtist(artistName!).catch(() => null);
          if (!resolved) return [];
          return source.fetchArtistAlbums(resolved.id, DISCOGRAPHY_LIMIT, artistName!).catch(() => []);
        })
      );

      const all = perSource.flat();
      return {
        albums: all.filter(a => a.releaseType !== 'single'),
        singles: all.filter(a => a.releaseType === 'single'),
      };
    },
  });
}
