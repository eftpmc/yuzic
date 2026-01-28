import { useQuery } from '@tanstack/react-query';

import { ExternalArtist, ExternalAlbumBase } from '@/types';
import * as musicbrainz from '@/api/musicbrainz';
import { resolveArtistMbid } from '@/utils/musicbrainz/resolveArtistMbid';
import { QueryKeys } from '@/enums/queryKeys';
import { staleTime } from '@/constants/staleTime';

const MBID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type UseExternalArtistInput = {
  /** Use directly when present and valid; otherwise we resolve via name. */
  mbid?: string | null;
  /** Used to resolve MBID when mbid is not provided or invalid. */
  name?: string | null;
};

function isValidMbid(s: string): boolean {
  return MBID_REGEX.test(s);
}

export function useExternalArtist(input: UseExternalArtistInput | null) {
  const mbid = input?.mbid ?? null;
  const name = input?.name ?? null;
  const enabled = !!(mbid || name);

  return useQuery({
    queryKey: [QueryKeys.ExternalArtist, mbid ?? name ?? ''],
    enabled,
    staleTime: staleTime.musicbrainz,
    refetchOnMount: true,

    queryFn: async (): Promise<ExternalArtist | null> => {
      if (!enabled) return null;

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

      const albums: ExternalAlbumBase[] = await musicbrainz.getArtistAlbums(
        resolvedMbid,
        baseArtist.name,
        15
      );

      return { ...baseArtist, albums };
    },
  });
}