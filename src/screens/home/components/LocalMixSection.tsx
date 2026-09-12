import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { useServerReachable } from '@/features/connectivity/useServerReachable';
import { getDayKey, getDailySeed, seededShuffle } from '@/features/home/hooks/useDailyLayout';
import {
  selectSongPlayCounts,
} from '@/utils/redux/selectors/statsSelectors';
import { selectSongsById } from '@/utils/redux/selectors/librarySelectors';
import SectionShelfHeader from './SectionShelfHeader';
import SongRow from '@/components/rows/SongRow';
import SkeletonListRow from '@/components/SkeletonListRow';
import { useSourceSectionPresence } from './SourceGroup';
import { spacing } from '@/constants/design';
import { SECTION_H_PADDING as H_PADDING } from '@/features/home/constants';
import type { Song, SongBase } from '@/types';

type Props = {
  /** This shelf's key in the home layout, so the source group above it knows
   * which of its sections has just gone quiet. */
  sectionKey: string;
  refreshKey?: number;
};

/** How many top-played tracks feed the daily seed pool, and how many of them
 * are actually queried for similarity per day — the same shape as the
 * because-you-listened seed pool in useDailyLayout, kept local here since
 * this shelf's seeds are songs rather than artists. */
const SEED_POOL_SIZE = 20;
const SEED_COUNT = 2;
const MAX_TRACKS = 10;

/**
 * "Your Mix" — a private, local-first daily mix built entirely from data
 * already on the device (play-stats) plus the server's own similarity graph
 * (`api.similar.getSimilarSongs`, the same capability queueProviders.ts uses
 * to extend Autoplay/Smart Shuffle). No external service is ever called: the
 * seed never leaves the device except as an id in a request to the user's
 * own configured server, and that request is identical in kind to the one
 * Smart Shuffle already makes.
 *
 * Deliberately not a new recommendation algorithm — picking a seed by play
 * count and asking the server what's similar to it is the existing
 * BecauseYouListened/ServerRandom pattern, just pointed at a local seed and
 * the server's native similarity instead of Deezer's.
 *
 * Presence is gated on having enough play history to seed from and the
 * server being reachable — never on deezerDiscoveryEnabled or
 * listenbrainzDiscoveryEnabled, since nothing here leaves the server.
 */
export default function LocalMixSection({ sectionKey, refreshKey = 0 }: Props) {
  const { t } = useTranslation();
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
      .filter((s): s is SongBase => Boolean(s));

    const seed = getDailySeed(`${dayKey}:localMix:${refreshKey}`);
    return seededShuffle(played, seed).slice(0, SEED_COUNT);
  }, [playCounts, songsById, dayKey, refreshKey]);

  // The capability is required on every valid adapter (see
  // capabilityRegistry.ts's serverAdapterSlots), so this is a defensive
  // presence-check rather than an optional-integration gate — it only ever
  // trips on the EMPTY_ADAPTER used before a server is connected.
  const hasSimilarity = typeof api.similar?.getSimilarSongs === 'function';
  const enabled = hasSimilarity && serverReachable && seeds.length > 0;

  const query = useQuery<Song[]>({
    queryKey: [QueryKeys.LocalMix, dayKey, refreshKey, seeds.map(s => s.id).join(',')],
    queryFn: async () => {
      const seedIds = new Set(seeds.map(s => s.id));
      const batches = await Promise.all(
        seeds.map(seed => api.similar.getSimilarSongs(seed.id).catch(() => []))
      );
      const seen = new Set<string>();
      const merged: Song[] = [];
      for (const batch of batches) {
        for (const song of batch) {
          if (seedIds.has(song.id) || seen.has(song.id)) continue;
          seen.add(song.id);
          merged.push(song);
        }
      }
      return merged.slice(0, MAX_TRACKS);
    },
    enabled,
    staleTime: 1000 * 60 * 60 * 6,
  });

  const data = useMemo(() => query.data ?? [], [query.data]);
  const isLoading = enabled && query.isLoading;
  const hasContent = isLoading || data.length > 0;

  useSourceSectionPresence(sectionKey, hasContent);

  const renderSong = useCallback((song: Song) => (
    <SongRow key={song.id} song={song} />
  ), []);

  // A heading over an empty rail is worse than no shelf — and the source
  // header above it goes with it, told by the presence report.
  if (!hasContent) return null;

  return (
    <View style={styles.container}>
      <SectionShelfHeader title={t('explore.sections.localMix')} />
      {isLoading ? (
        <View style={styles.loader}>
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonListRow key={`local-mix-loading-${index}`} />
          ))}
        </View>
      ) : (
        data.map(renderSong)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  loader: { paddingHorizontal: H_PADDING },
});
