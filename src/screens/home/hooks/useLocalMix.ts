import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';

import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { useServerReachable } from '@/features/connectivity/useServerReachable';
import { getDayKey, getDailySeed, seededShuffle } from '@/features/home/hooks/useDailyLayout';
import { selectSongPlayCounts } from '@/utils/redux/selectors/statsSelectors';
import { selectSongsById } from '@/utils/redux/selectors/librarySelectors';
import type { Song, SongBase } from '@/types';

const SEED_POOL_SIZE = 20;
const SEED_COUNT = 2;
export const LOCAL_MIX_MAX_TRACKS = 10;

/**
 * The device-local daily mix used by both Home and its complete screen.
 *
 * The request intentionally stays within the configured music server: local
 * play history chooses the seeds, then the server's existing similarity graph
 * supplies the songs. Keeping it here prevents the preview and full screen
 * from drifting into two differently generated "Your Mix" lists.
 */
export function useLocalMix(refreshKey = 0) {
  const api = useApi();
  const songsById = useSelector(selectSongsById);
  const playCounts = useSelector(selectSongPlayCounts);
  const serverReachable = useServerReachable();
  const dayKey = getDayKey();

  const seeds = useMemo<SongBase[]>(() => {
    const played = Object.entries(playCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, SEED_POOL_SIZE)
      .map(([id]) => songsById.get(id))
      .filter((song): song is SongBase => Boolean(song));

    return seededShuffle(played, getDailySeed(`${dayKey}:localMix:${refreshKey}`)).slice(0, SEED_COUNT);
  }, [dayKey, playCounts, refreshKey, songsById]);

  const hasSimilarity = typeof api.similar?.getSimilarSongs === 'function';
  const enabled = hasSimilarity && serverReachable && seeds.length > 0;

  const query = useQuery<Song[]>({
    queryKey: [QueryKeys.LocalMix, dayKey, refreshKey, seeds.map(song => song.id).join(',')],
    queryFn: async () => {
      const seedIds = new Set(seeds.map(song => song.id));
      const batches = await Promise.all(
        seeds.map(seed => api.similar.getSimilarSongs(seed.id).catch(() => []))
      );
      const seen = new Set<string>();
      const mix: Song[] = [];
      for (const batch of batches) {
        for (const song of batch) {
          if (seedIds.has(song.id) || seen.has(song.id)) continue;
          seen.add(song.id);
          mix.push(song);
        }
      }
      return mix.slice(0, LOCAL_MIX_MAX_TRACKS);
    },
    enabled,
    staleTime: 1000 * 60 * 60 * 6,
  });

  const songs = useMemo(() => query.data ?? [], [query.data]);
  return {
    songs,
    isLoading: enabled && query.isLoading,
    hasContent: enabled && (query.isLoading || songs.length > 0),
  };
}
