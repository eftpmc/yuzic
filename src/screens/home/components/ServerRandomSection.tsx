import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { useApi } from '@/api';
import { useTheme } from '@/hooks/useTheme';
import { useRadius } from '@/hooks/useRadius';
import { usePlayingActions } from '@/contexts/PlayingContext';
import { QueryKeys } from '@/enums/queryKeys';
import { getDayKey, getDailySeed, seededShuffle } from '@/features/home/hooks/useDailyLayout';
import { selectLibraryGenres } from '@/utils/redux/selectors/librarySelectors';
import {
  SECTION_H_PADDING as H_PADDING,
  SECTION_GRID_GAP,
  SECTION_VISIBLE_ITEMS,
} from '@/features/home/constants';
import MediaTile from './MediaTile';
import SkeletonTiles from '@/components/SkeletonTiles';
import type { Song } from '@/types';
import { spacing, typography } from '@/constants/design';

type Props = { refreshKey?: number };

/**
 * Server-random draw shelf — cheap discovery that changes on every daily
 * seed. Only useful for library-heavy users where "surprise me" beats
 * looking through their own shelves.
 */
export default function ServerRandomSection({ refreshKey = 0 }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rad = useRadius();
  const api = useApi();
  const { playSongs } = usePlayingActions();
  const { width: screenWidth } = useWindowDimensions();
  const genres = useSelector(selectLibraryGenres);
  const dayKey = getDayKey();

  // Genre-of-the-day rotation: pick one library genre from the daily
  // shuffled order and use it as the seed for the random draw. Turns a
  // pure-dice shelf into a themed one that reads differently each day
  // ("today's Ambient", "today's Post-punk") without any user config.
  const themeGenre = useMemo(() => {
    if (!genres || genres.length === 0) return null;
    const seed = getDailySeed(`${dayKey}:${refreshKey}`);
    return seededShuffle(genres, seed)[0] ?? null;
  }, [dayKey, refreshKey, genres]);

  const gridItemWidth = useMemo(
    () => (screenWidth - H_PADDING * 2 - SECTION_GRID_GAP * 2) / SECTION_VISIBLE_ITEMS,
    [screenWidth]
  );

  const query = useQuery<Song[]>({
    queryKey: [QueryKeys.ServerRandom, dayKey, refreshKey, themeGenre ?? ''],
    queryFn: async () => (await api.discovery?.getRandomSongs({
      size: 12,
      ...(themeGenre ? { genre: themeGenre } : {}),
    })) ?? [],
    enabled: Boolean(api.discovery),
    staleTime: 1000 * 60 * 60 * 4,
  });

  const data = query.data ?? [];

  const handlePlay = useCallback((index: number) => {
    if (data.length === 0) return;
    void playSongs(data, { startIndex: index });
  }, [data, playSongs]);

  const renderSong = useCallback(({ item, index }: { item: Song; index: number }) => (
    <MediaTile
      cover={item.cover}
      title={item.title}
      subtitle={item.artist}
      size={gridItemWidth}
      radius={rad.card}
      onPress={() => handlePlay(index)}
    />
  ), [gridItemWidth, handlePlay, rad.card]);

  if (!api.discovery) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.secondary }]}>
        {themeGenre
          ? t('explore.sections.serverRandomThemed', {
              genre: themeGenre,
              defaultValue: `Today's ${themeGenre}`,
            })
          : t('explore.sections.serverRandom', 'Surprise me')}
      </Text>
      {query.isLoading ? (
        <SkeletonTiles
          itemSize={gridItemWidth}
          gap={SECTION_GRID_GAP}
          horizontalPadding={H_PADDING}
          variant="album"
        />
      ) : data.length === 0 ? null : (
        <FlashList
          horizontal
          data={data}
          keyExtractor={(item) => item.id}
          overrideItemLayout={(layout) => { (layout as { size?: number }).size = gridItemWidth; }}
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: H_PADDING }}
          ItemSeparatorComponent={() => <View style={{ width: SECTION_GRID_GAP }} />}
          renderItem={renderSong}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { ...typography.sectionTitle, marginBottom: spacing.md, marginLeft: H_PADDING },
});
