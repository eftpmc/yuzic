import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { getCreatedForPlaylists } from '@/api/listenbrainz';
import type { CreatedForMixType } from '@/api/listenbrainz';
import { QueryKeys } from '@/enums/queryKeys';
import { selectListenBrainzUsername } from '@/utils/redux/selectors/listenbrainzSelectors';
import { selectListenbrainzDiscoveryEnabled } from '@/utils/redux/selectors/settingsSelectors';
import SectionShelfHeader from './SectionShelfHeader';
import SongRow from '@/components/rows/SongRow';
import SkeletonListRow from '@/components/SkeletonListRow';
import { useSourceSectionPresence } from './SourceGroup';
import { spacing } from '@/constants/design';
import { SECTION_H_PADDING as H_PADDING } from '@/features/home/constants';
import type { ExternalSong } from '@/types';

type Props = {
  /** This shelf's key in the home layout, so the source group above it knows
   * which of its sections has just gone quiet. */
  sectionKey: string;
  mixType: CreatedForMixType;
  refreshKey?: number;
};

const TITLE_KEYS: Record<CreatedForMixType, string> = {
  'daily-jams': 'explore.sections.lbCreatedFor.dailyJams',
  'weekly-jams': 'explore.sections.lbCreatedFor.weeklyJams',
  'weekly-exploration': 'explore.sections.lbCreatedFor.weeklyExploration',
};

const MAX_TRACKS = 10;

/**
 * One of ListenBrainz's periodic "created for you" mixes — Daily Jams,
 * Weekly Jams, Weekly Exploration — as its own standalone shelf. LB built
 * the mix; this only fetches and renders it, the same discovery.shelf
 * pattern as every other external Home row, so there is no local
 * mix-generator here.
 *
 * Rides the same setting as the similar-artists shelf (`listenbrainzDiscoveryEnabled`)
 * rather than a setting of its own, plus a configured LB username — without
 * one there's nobody to fetch createdfor playlists for. Off by default like
 * every external discovery source.
 *
 * Tracks that aren't in the local library render through the shared
 * `SongRow`, which already gives an unowned/external track Want/Get for
 * free — nothing mix-specific is needed here for that.
 */
export default function LBCreatedForSection({ sectionKey, mixType, refreshKey = 0 }: Props) {
  const { t } = useTranslation();
  const discoveryEnabled = useSelector(selectListenbrainzDiscoveryEnabled);
  const username = useSelector(selectListenBrainzUsername);

  const enabled = discoveryEnabled && Boolean(username);

  const query = useQuery<ExternalSong[]>({
    queryKey: [QueryKeys.LbCreatedForPlaylists, username || '', mixType, refreshKey],
    queryFn: async () => {
      const mixes = await getCreatedForPlaylists(username);
      return mixes.find((m) => m.mixType === mixType)?.tracks ?? [];
    },
    enabled,
    staleTime: 1000 * 60 * 60 * 6,
    networkMode: 'online',
  });

  const data = useMemo(() => (query.data ?? []).slice(0, MAX_TRACKS), [query.data]);
  const isLoading = enabled && query.isLoading;
  const hasContent = isLoading || data.length > 0;

  useSourceSectionPresence(sectionKey, hasContent);

  const renderSong = useCallback((song: ExternalSong) => (
    <SongRow key={song.id} song={song} />
  ), []);

  // A heading over an empty rail is worse than no shelf — and the source
  // header above it goes with it, told by the presence report.
  if (!hasContent) return null;

  return (
    <View style={styles.container}>
      <SectionShelfHeader title={t(TITLE_KEYS[mixType])} />
      {isLoading ? (
        <View style={styles.loader}>
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonListRow key={`lb-created-for-loading-${index}`} />
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
