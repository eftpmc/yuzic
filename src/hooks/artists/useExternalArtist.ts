import { useQuery } from '@tanstack/react-query';

import {
  Artist,
  ExternalArtist,
  ExternalAlbumBase,
} from '@/types';

import * as musicbrainz from '@/api/musicbrainz';
import { resolveArtistMbid } from '@/utils/musicbrainz/resolveArtistMbid';
import { QueryKeys } from '@/enums/queryKeys';
import { staleTime } from '@/constants/staleTime';

type ExternalArtistInput = {
  id?: string;
  name: string;
};

export function useExternalArtist(
  artist: Artist | ExternalArtistInput | null
) {
  return useQuery({
    queryKey: [
      QueryKeys.ExternalArtist,
      artist?.id ?? artist?.name,
    ],

    enabled: !!artist?.name,
    staleTime: staleTime.musicbrainz,

    queryFn: async (): Promise<ExternalArtist | null> => {
      if (!artist) return null;

      const mbid = await resolveArtistMbid(
        artist.id,
        artist.name
      );

      if (!mbid) {
        throw new Error(
          `Unable to resolve MusicBrainz ID for "${artist.name}"`
        );
      }

      const baseArtist =
        await musicbrainz.getArtist(mbid);

      if (!baseArtist) {
        throw new Error(
          `MusicBrainz artist not found: ${mbid}`
        );
      }

      const albums: ExternalAlbumBase[] =
        await musicbrainz.getArtistAlbums(
          mbid,
          baseArtist.name,
          15
        );

      return {
        ...baseArtist,
        albums,
      };
    },
  });
}