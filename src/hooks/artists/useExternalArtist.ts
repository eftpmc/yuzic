import { useQuery } from '@tanstack/react-query';

import { ExternalArtist } from '@/types';
import * as deezer from '@/api/deezer';
import { QueryKeys } from '@/enums/queryKeys';

export type UseExternalArtistInput = {
  source?: 'deezer' | 'musicbrainz' | 'lastfm';
  artistId?: string | null;
  mbid?: string | null;
  name?: string | null;
};

async function getDeezerExternalArtist(
  artistId: string,
  fallbackMbid?: string | null
): Promise<ExternalArtist | null> {
  const baseArtist = await deezer.getDeezerArtist(artistId);
  if (!baseArtist) return null;

  const [albums, topTracks, similarArtists] = await Promise.all([
    deezer.getDeezerArtistAlbums(artistId, 80, baseArtist),
    deezer.getDeezerArtistTopTracks(artistId, 10),
    deezer.getDeezerRelatedArtists(artistId, 8),
  ]);

  return {
    ...baseArtist,
    externalIds: {
      ...baseArtist.externalIds,
      mbid: fallbackMbid ?? baseArtist.externalIds?.mbid ?? null,
    },
    topTracks,
    albums: albums.filter(album => album.releaseType !== 'single'),
    singles: albums.filter(album => album.releaseType === 'single'),
    similarArtists,
  };
}

export function useExternalArtist(input: UseExternalArtistInput | null) {
  const mbid = input?.mbid ?? null;
  const name = input?.name ?? null;
  const source = input?.source;
  const artistId = input?.artistId ?? null;
  const enabled = !!(artistId || mbid || name);

  return useQuery({
    queryKey: [QueryKeys.ExternalArtist, source ?? 'deezer', artistId ?? mbid ?? name ?? ''],
    enabled,
    staleTime: 1000 * 60 * 60 * 24,

    queryFn: async (): Promise<ExternalArtist | null> => {
      if (!enabled) return null;

      if (source === 'deezer' && artistId) {
        return getDeezerExternalArtist(artistId, mbid);
      }

      if (name) {
        const deezerArtist = await deezer.resolveDeezerArtistByName(name);
        if (deezerArtist?.externalIds?.deezerId) {
          const externalArtist = await getDeezerExternalArtist(deezerArtist.externalIds.deezerId, mbid);
          if (externalArtist) return externalArtist;
        }
      }

      throw new Error(`Unable to resolve Deezer artist for "${name ?? artistId ?? 'artist'}"`);
    },
  });
}
