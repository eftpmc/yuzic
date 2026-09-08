import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { selectActiveServerId } from '@/utils/redux/selectors/serversSelectors';
import type { ExternalArtistBase } from '@/types';

/**
 * Similar-artists sourced from the media server itself (Navidrome's
 * getArtistInfo2, Jellyfin/Emby's Similar endpoint). Skipped when the server
 * doesn't implement it or when we don't have a library id to seed from — a
 * name-only artist (a Deezer result the user is browsing) has nothing here to
 * ask.
 */
export function useServerSimilarArtists(artistId: string | null | undefined, limit = 12) {
  const api = useApi();
  const serverId = useSelector(selectActiveServerId);

  const enabled = Boolean(artistId) && typeof api.similar.getSimilarArtists === 'function';

  const queryKey = useMemo(
    () => [QueryKeys.SimilarArtists, serverId ?? '', artistId ?? '', limit],
    [serverId, artistId, limit]
  );

  return useQuery<ExternalArtistBase[]>({
    queryKey,
    queryFn: () => api.similar.getSimilarArtists!(artistId!, limit),
    enabled,
    staleTime: 1000 * 60 * 60 * 24,
    networkMode: 'online',
  });
}
