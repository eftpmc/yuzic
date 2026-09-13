import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import SectionShelfHeader from './SectionShelfHeader';
import SongRow from '@/components/rows/SongRow';
import SkeletonListRow from '@/components/SkeletonListRow';
import { useSourceSectionPresence } from './SourceGroup';
import { useLocalMix } from '../hooks/useLocalMix';
import { spacing } from '@/constants/design';
import { SECTION_H_PADDING as H_PADDING } from '@/features/home/constants';
import type { Song } from '@/types';

type Props = {
  /** This shelf's key in the home layout, so the source group above it knows
   * which of its sections has just gone quiet. */
  sectionKey: string;
  refreshKey?: number;
};

/** The Home preview is intentionally short; the heading opens the complete mix. */
const PREVIEW_TRACKS = 3;

export default function LocalMixSection({ sectionKey, refreshKey = 0 }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { songs, isLoading, hasContent } = useLocalMix(refreshKey);

  useSourceSectionPresence(sectionKey, hasContent);

  const renderSong = useCallback((song: Song) => (
    <SongRow key={song.id} song={song} />
  ), []);

  if (!hasContent) return null;

  return (
    <View style={styles.container}>
      <SectionShelfHeader
        testID="home-local-mix-see-all"
        title={t('explore.sections.localMix')}
        seeAllLabel={t('library.seeAll')}
        onSeeAll={() => router.push({ pathname: '/localMixView', params: { refreshKey: String(refreshKey) } })}
      />
      {isLoading ? (
        <View style={styles.loader}>
          {Array.from({ length: PREVIEW_TRACKS }).map((_, index) => (
            <SkeletonListRow key={`local-mix-loading-${index}`} />
          ))}
        </View>
      ) : (
        songs.slice(0, PREVIEW_TRACKS).map(renderSong)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  loader: { paddingHorizontal: H_PADDING },
});
