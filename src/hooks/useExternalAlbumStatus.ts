import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { useLibrary } from '@/contexts/LibraryContext';
import { QueryKeys } from '@/enums/queryKeys';
import type { ExternalAlbumBase } from '@/types';
import * as lidarr from '@/api/lidarr';
import * as slskd from '@/api/slskd';
import {
  selectLidarrConfig,
  selectLidarrAuthenticated,
  selectSlskdConfig,
  selectSlskdAuthenticated,
} from '@/utils/redux/selectors/downloadersSelectors';
import { normalize } from '@/utils/normalize';

export type ExternalAlbumStatus =
  | { kind: 'in_library' }
  | { kind: 'downloading'; progress: number; source: 'lidarr' | 'slskd' }
  | { kind: 'none' };

export function useExternalAlbumStatus(album: ExternalAlbumBase | null): ExternalAlbumStatus {
  const { albums: libraryAlbums } = useLibrary();

  const lidarrConfig = useSelector(selectLidarrConfig);
  const isLidarrConnected = useSelector(selectLidarrAuthenticated);

  const slskdConfig = useSelector(selectSlskdConfig);
  const isSlskdConnected = useSelector(selectSlskdAuthenticated);

  const isInLibrary = useMemo(() => {
    if (!album) return false;
    const normTitle = normalize(album.title);
    const normArtist = normalize(album.artist);
    return libraryAlbums.some(a =>
      (album.id && a.mbid && a.mbid === album.id) ||
      (normalize(a.title) === normTitle && normalize(a.artist.name) === normArtist)
    );
  }, [libraryAlbums, album]);

  const { data: lidarrQueue } = useQuery({
    queryKey: [QueryKeys.LidarrQueue],
    queryFn: () => lidarr.fetchQueue(lidarrConfig),
    enabled: !isInLibrary && isLidarrConnected && !!album,
    staleTime: 0,
    refetchInterval: 12_000,
  });

  const { data: slskdQueue } = useQuery({
    queryKey: [QueryKeys.SlskdQueue],
    queryFn: () => slskd.fetchQueue(slskdConfig),
    enabled: !isInLibrary && isSlskdConnected && !!album,
    staleTime: 0,
    refetchInterval: 12_000,
  });

  return useMemo<ExternalAlbumStatus>(() => {
    if (isInLibrary) return { kind: 'in_library' };
    if (!album) return { kind: 'none' };

    const normTitle = normalize(album.title);
    const normArtist = normalize(album.artist);

    if (lidarrQueue) {
      const match = lidarrQueue.find(
        r => normalize(r.albumTitle) === normTitle && normalize(r.artistName) === normArtist
      );
      if (match) return { kind: 'downloading', progress: match.percentComplete, source: 'lidarr' };
    }

    if (slskdQueue) {
      const match = slskdQueue.find(r => {
        if (r.state.toLowerCase() === 'completed') return false;
        const t = normalize(r.title);
        return t.includes(normTitle) || normTitle.includes(t);
      });
      if (match) return { kind: 'downloading', progress: match.percentComplete, source: 'slskd' };
    }

    return { kind: 'none' };
  }, [isInLibrary, album, lidarrQueue, slskdQueue]);
}
