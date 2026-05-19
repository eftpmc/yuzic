import { useQuery } from '@tanstack/react-query';
import { ExternalArtist } from '@/types';
import { QueryKeys } from '@/enums/queryKeys';
import { ALL_SOURCES } from '@/features/sources/registry';

export type UseExternalArtistInput = {
  source?: string;
  artistId?: string | null;
  mbid?: string | null;
  name?: string | null;
};

export function useExternalArtist(input: UseExternalArtistInput | null) {
  const source = input?.source;
  const artistId = input?.artistId ?? null;
  const mbid = input?.mbid ?? null;
  const name = input?.name ?? null;
  const enabled = !!(artistId || mbid || name);

  return useQuery({
    queryKey: [QueryKeys.ExternalArtist, source ?? 'unknown', artistId ?? mbid ?? name ?? ''],
    enabled,
    staleTime: 1000 * 60 * 60 * 24,

    queryFn: async (): Promise<ExternalArtist | null> => {
      const sourceDef = ALL_SOURCES.find(s => s.id === source);
      if (sourceDef && artistId) return sourceDef.fetchArtist(artistId, mbid);
      throw new Error(`Unable to resolve artist "${name ?? artistId ?? 'unknown'}"`);
    },
  });
}
