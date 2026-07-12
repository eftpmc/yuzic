import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/enums/queryKeys';
import { ExternalAlbum } from '@/types';
import { ALL_SOURCES, useEnabledExternalSources } from '@/features/sources/registry';

type UseExternalAlbumInput = {
  source?: string;
  albumId?: string;
  artist?: string;
  title?: string;
};

type UseExternalAlbumResult = {
  album: ExternalAlbum | null;
  isLoading: boolean;
  error: Error | null;
};

export function useExternalAlbum(input: UseExternalAlbumInput): UseExternalAlbumResult {
  const { source, albumId, artist, title } = input;
  const enabledSources = useEnabledExternalSources();
  const canResolveByName = !!artist && !!title && enabledSources.length > 0;

  const query = useQuery<ExternalAlbum | null, Error>({
    queryKey: [
      QueryKeys.ExternalAlbum,
      source ?? 'unknown',
      albumId || `${artist}::${title}`,
      enabledSources.map(s => s.id).join(','),
    ],
    enabled: !!albumId || canResolveByName,
    staleTime: 1000 * 60 * 60 * 24,

    queryFn: async () => {
      // Direct source + ID lookup
      const sourceDef = ALL_SOURCES.find(s => s.id === source);
      if (sourceDef && albumId) return sourceDef.fetchAlbum(albumId);

      // No usable id — resolve by artist + title across enabled sources.
      // This is the forceExternal path: the caller only knows the local
      // album's metadata, not any external id.
      if (artist && title) {
        for (const s of enabledSources) {
          const resolved = await s.resolveAlbum(artist, title).catch(() => null);
          if (!resolved) continue;
          const album = await s.fetchAlbum(resolved.id).catch(() => null);
          if (album) return album;
        }
        throw new Error(`Unable to resolve album "${title}"`);
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
