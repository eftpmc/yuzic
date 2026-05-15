import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useAlbums } from '@/hooks/albums';
import { useTheme } from '@/hooks/useTheme';
import AlbumItem from '@/screens/home/components/Items/AlbumItem';
import SectionEmptyState from '../SectionEmptyState';
import { useTranslation } from 'react-i18next';
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers';
import { getExploreDayKey, getExploreSeed, seededShuffle } from '@/features/explore/hooks/useDailyLayout';

const H_PADDING = 12;
const GAP = 12;
const VISIBLE_ITEMS = 2.5;
const MIN_ALBUMS = 8;
const MAX_ALBUMS = 10;

const getItemWidth = (width: number) => {
  const availableWidth = width - H_PADDING * 2;
  return (availableWidth - GAP * (VISIBLE_ITEMS - 1)) / VISIBLE_ITEMS;
};

type Props = { refreshKey?: number }

export default function RandomAlbums({ refreshKey = 0 }: Props) {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const { albums } = useAlbums();
  const gridItemWidth = getItemWidth(width);
  const dayKey = getExploreDayKey();
  const dailySeed = getExploreSeed(dayKey) + refreshKey * 2147483647;

  const randomAlbums = useMemo(() => {
    if (albums.length === 0) return [];
    const shuffled = seededShuffle(albums, dailySeed);
    return shuffled.slice(0, Math.min(MAX_ALBUMS, albums.length));
  }, [albums, dailySeed]);
  const coversToPrefetch = useMemo(() => randomAlbums.map(album => album.cover), [randomAlbums]);
  usePrefetchCovers(coversToPrefetch, 'grid');

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        {t('explore.sections.randomAlbums')}
      </Text>
      {randomAlbums.length < MIN_ALBUMS ? (
        <SectionEmptyState message={t('explore.empty.randomAlbums')} />
      ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {randomAlbums.map((album) => (
          <View key={album.id} style={[styles.item, { width: gridItemWidth }]}>
            <AlbumItem
              album={album}
              id={album.id}
              title={album.title}
              subtext={album.subtext}
              cover={album.cover}
              isGridView
              gridWidth={gridItemWidth}
              gridSpacing={0}
            />
          </View>
        ))}
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    marginLeft: H_PADDING,
  },
  titleDark: {
    color: '#fff',
  },
  scrollContent: {
    paddingHorizontal: H_PADDING,
  },
  item: {
    marginRight: GAP,
    minWidth: 0,
  },
  containerDark: {},
});
