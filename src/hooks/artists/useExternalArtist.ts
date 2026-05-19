import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { ExternalArtist } from '@/types';
import { QueryKeys } from '@/enums/queryKeys';
import { ALL_SOURCES } from '@/features/sources/registry';
import { selectMusicbrainzExternalEnabled, selectDeezerExternalEnabled } from '@/utils/redux/selectors/settingsSelectors';

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

  const mbEnabled = useSelector(selectMusicbrainzExternalEnabled);
  const deezerEnabled = useSelector(selectDeezerExternalEnabled);

  return useQuery({
    queryKey: [QueryKeys.ExternalArtist, source ?? 'unknown', artistId ?? mbid ?? name ?? ''],
    enabled,
    staleTime: 1000 * 60 * 60 * 24,

    queryFn: async (): Promise<ExternalArtist | null> => {
      // Direct source + ID lookup
      const sourceDef = ALL_SOURCES.find(s => s.id === source);
      if (sourceDef && artistId) return sourceDef.fetchArtist(artistId, mbid);

      // mbid available — prefer MusicBrainz if enabled (direct ID lookup)
      if (mbid && mbEnabled) {
        const mb = ALL_SOURCES.find(s => s.id === 'musicbrainz');
        if (mb) return mb.fetchArtist(mbid, mbid);
      }

      // Name fallback — try Deezer if enabled
      if (name && deezerEnabled) {
        const deezer = ALL_SOURCES.find(s => s.id === 'deezer');
        if (deezer) {
          const resolved = await deezer.resolveArtist(name);
          if (resolved) return deezer.fetchArtist(resolved.id, mbid);
        }
      }

      throw new Error(`Unable to resolve artist "${name ?? artistId ?? 'unknown'}"`);
    },
  });
}
