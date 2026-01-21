import { useQuery } from '@tanstack/react-query';

import { QueryKeys } from '@/enums/queryKeys';
import { ExternalAlbum } from '@/types';
import { staleTime } from '@/constants/staleTime';

import * as musicbrainz from '@/api/musicbrainz';

type UseExternalAlbumResult = {
  album: ExternalAlbum | null;
  isLoading: boolean;
  error: Error | null;
};

export function useExternalAlbum(
  releaseGroupId: string
): UseExternalAlbumResult {
  const query = useQuery<ExternalAlbum | null, Error>({
    queryKey: [QueryKeys.ExternalAlbum, releaseGroupId],
    enabled: !!releaseGroupId,
    staleTime: staleTime.musicbrainz,

    queryFn: async () => {
      // 1. Fetch release-group (album metadata)
      const group = await musicbrainz.getReleaseGroup(
        releaseGroupId
      );

      if (!group) return null;

      // 2. Pick a canonical release (earliest official)
      const release = await musicbrainz.getCanonicalRelease(
        releaseGroupId
      );

      if (!release) return null;

      // 3. Fetch tracks from the release
      const tracks = await musicbrainz.getReleaseTracks(
        release.id
      );

      return {
        id: group.id,
        title: group.title,
        artist: group.artist,
        subtext: group.artist,
        cover: { kind: 'musicbrainz' },
        songs: tracks,
      };
    },
  });

  return {
    album: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ?? null,
  };
}