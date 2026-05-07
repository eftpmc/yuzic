import { useQuery } from '@tanstack/react-query';

import { ExternalArtist } from '@/types';
import * as musicbrainz from '@/api/musicbrainz';
import * as deezer from '@/api/deezer';
import { resolveArtistMbid } from '@/utils/musicbrainz/resolveArtistMbid';
import { QueryKeys } from '@/enums/queryKeys';
import { staleTime } from '@/constants/staleTime';
import { getSimilarExternalArtists } from './useSimilarArtists';

const MBID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type UseExternalArtistInput = {
  source?: 'deezer' | 'musicbrainz' | 'lastfm';
  artistId?: string | null;
  /** Use directly when present and valid; otherwise we resolve via name. */
  mbid?: string | null;
  /** Used to resolve MBID when mbid is not provided or invalid. */
  name?: string | null;
};

function isValidMbid(s: string): boolean {
  return MBID_REGEX.test(s);
}

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
    queryKey: [QueryKeys.ExternalArtist, source ?? 'musicbrainz', artistId ?? mbid ?? name ?? ''],
    enabled,
    staleTime: staleTime.musicbrainz,

    queryFn: async (): Promise<ExternalArtist | null> => {
      if (!enabled) return null;

      if (source === 'deezer' && artistId) {
        return getDeezerExternalArtist(artistId, mbid);
      }

      if (!source && name) {
        const deezerArtist = await deezer.resolveDeezerArtistByName(name);
        if (deezerArtist?.externalIds?.deezerId) {
          const externalArtist = await getDeezerExternalArtist(deezerArtist.externalIds.deezerId, mbid);
          if (externalArtist) return externalArtist;
        }
      }

      let resolvedMbid: string | null =
        mbid && isValidMbid(mbid) ? mbid : null;

      if (!resolvedMbid && name) {
        resolvedMbid = await resolveArtistMbid(undefined, name);
      }

      if (!resolvedMbid) {
        throw new Error(
          `Unable to resolve MusicBrainz ID for "${name ?? 'artist'}"`
        );
      }

      const baseArtist = await musicbrainz.getArtist(resolvedMbid);
      if (!baseArtist) {
        throw new Error(
          `MusicBrainz artist not found: ${resolvedMbid}`
        );
      }

      const [discography, similarArtists] = await Promise.all([
        musicbrainz.getArtistDiscography(resolvedMbid, baseArtist.name, {
          albumLimit: 80,
          singleLimit: 80,
        }),
        getSimilarExternalArtists({
          mbid: resolvedMbid,
          excludeName: baseArtist.name,
          limit: 8,
        }),
      ]);

      return {
        ...baseArtist,
        albums: discography.albums,
        singles: discography.singles,
        topTracks: [],
        similarArtists,
      };
    },
  });
}
