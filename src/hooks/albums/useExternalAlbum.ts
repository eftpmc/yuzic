import { useQuery } from '@tanstack/react-query';

import { QueryKeys } from '@/enums/queryKeys';
import { ExternalAlbum } from '@/types';
import { staleTime } from '@/constants/staleTime';
import { sharedMusicBrainzQueue } from '@/features/explore/utils/requestQueue';

import * as musicbrainz from '@/api/musicbrainz';
import * as deezer from '@/api/deezer';

type UseExternalAlbumResult = {
  album: ExternalAlbum | null;
  isLoading: boolean;
  error: Error | null;
};

type ResolveResult = {
  releaseGroupId: string;
  releaseId?: string;
};

/** Resolve release-group ID to metadata. Used when albumId is a release-group (e.g. from MusicBrainz search). */
async function resolveReleaseGroup(albumId: string): Promise<ResolveResult | null> {
  const group = await sharedMusicBrainzQueue.run(() =>
    musicbrainz.getReleaseGroup(albumId)
  );
  if (group) return { releaseGroupId: albumId };
  return null;
}

/**
 * Fetches external album data from MusicBrainz.
 * @param albumId - MusicBrainz release ID or release-group ID (servers may provide either)
 */
export function useExternalAlbum(
  albumIdOrInput: string | { source?: 'deezer' | 'musicbrainz' | 'lastfm'; albumId: string; artist?: string; title?: string }
): UseExternalAlbumResult {
  const albumId = typeof albumIdOrInput === 'string' ? albumIdOrInput : albumIdOrInput.albumId;
  const source = typeof albumIdOrInput === 'string' ? undefined : albumIdOrInput.source;
  const artist = typeof albumIdOrInput === 'string' ? undefined : albumIdOrInput.artist;
  const title = typeof albumIdOrInput === 'string' ? undefined : albumIdOrInput.title;

  const query = useQuery<ExternalAlbum | null, Error>({
    queryKey: [QueryKeys.ExternalAlbum, source ?? 'musicbrainz', albumId],
    enabled: !!albumId,
    staleTime: staleTime.musicbrainz,

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

      // Try single-request path first (release ID from Navidrome/Jellyfin)
      const fromRelease = await sharedMusicBrainzQueue.run(() =>
        musicbrainz.getReleaseWithDetails(albumId)
      );
      if (fromRelease) return fromRelease;

      // Fall back to release-group path (e.g. from MusicBrainz search)
      const resolved = await resolveReleaseGroup(albumId);
      if (!resolved) return null;

      const { releaseGroupId, releaseId } = resolved;

      const group = await sharedMusicBrainzQueue.run(() =>
        musicbrainz.getReleaseGroup(releaseGroupId)
      );
      if (!group) return null;

      let trackReleaseId = releaseId;
      if (!trackReleaseId) {
        const canonical = await sharedMusicBrainzQueue.run(() =>
          musicbrainz.getCanonicalRelease(releaseGroupId)
        );
        if (!canonical) return null;
        trackReleaseId = canonical.id;
      }

      const tracks = await sharedMusicBrainzQueue.run(() =>
        musicbrainz.getReleaseTracks(
          trackReleaseId!,
          group.id,
          group.artist
        )
      );

      return {
        id: group.id,
        title: group.title,
        artist: group.artist,
        artistMbid: group.artistMbid,
        subtext: group.artist,
        cover: { kind: 'musicbrainz', releaseGroupId: group.id },
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
