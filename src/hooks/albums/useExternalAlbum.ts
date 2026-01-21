import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { QueryKeys } from '@/enums/queryKeys';
import { ExternalAlbum } from '@/types';
import { staleTime } from '@/constants/staleTime';
import { selectLastfmConfig } from '@/utils/redux/selectors/lastfmSelectors';
import * as lastfm from '@/api/lastfm';

type UseExternalAlbumResult = {
  album: ExternalAlbum | null;
  isLoading: boolean;
  error: Error | null;
};

export function useExternalAlbum(
  album: string,
  artist: string
): UseExternalAlbumResult {
  const lastfmConfig = useSelector(selectLastfmConfig);

  const query = useQuery<ExternalAlbum | null, Error>({
    queryKey: [QueryKeys.LastfmAlbum, artist, album],
    queryFn: () =>
      lastfmConfig
        ? lastfm.getAlbumInfo(lastfmConfig, { album, artist })
        : Promise.resolve(null),
    enabled: !!album && !!artist && !!lastfmConfig,
    staleTime: staleTime.lastfm,
  });

  return {
    album: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ?? null,
  };
}