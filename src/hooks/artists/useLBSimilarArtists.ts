import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { getLBSimilarArtists } from '@/api/listenbrainz';
import { QueryKeys } from '@/enums/queryKeys';
import { selectListenbrainzDiscoveryEnabled } from '@/utils/redux/selectors/settingsSelectors';
import type { ExternalArtistBase } from '@/types';

/**
 * Similar-artists from ListenBrainz's public session-based graph. Keyed on
 * MBID (no user auth required), so connecting an account is not what turns it
 * on — the ListenBrainz discovery setting is, and it is off until the user
 * asks. Skipped when the seed artist has no MBID: LB has nothing to match on.
 */
export function useLBSimilarArtists(
  seed: { mbid?: string | null; excludeName?: string } | null,
  limit = 12
) {
  const discoveryEnabled = useSelector(selectListenbrainzDiscoveryEnabled);
  const mbid = seed?.mbid ?? null;
  const excludeName = seed?.excludeName?.trim().toLowerCase();

  const queryKey = useMemo(
    () => [QueryKeys.SimilarArtists, 'listenbrainz', mbid ?? '', limit],
    [mbid, limit]
  );

  return useQuery<ExternalArtistBase[]>({
    queryKey,
    queryFn: async () => {
      const raw = await getLBSimilarArtists(mbid!, limit);
      return raw
        .filter((a) => !excludeName || a.name.trim().toLowerCase() !== excludeName)
        .map((a) => ({
          id: a.artistMbid,
          name: a.name,
          cover: { kind: 'letter' as const, name: a.name },
          subtext: '',
          externalIds: { mbid: a.artistMbid },
        }));
    },
    enabled: discoveryEnabled && Boolean(mbid),
    staleTime: 1000 * 60 * 60 * 24,
    networkMode: 'online',
  });
}
