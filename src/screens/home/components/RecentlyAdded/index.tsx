import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useAlbums } from '@/hooks/albums';
import { useTheme } from '@/hooks/useTheme';
import AlbumItem from '@/screens/library/components/Items/AlbumItem';
import SectionEmptyState from '../SectionEmptyState';
import { useTranslation } from 'react-i18next';
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers';

const H_PADDING = 12;
const GAP = 12;
const VISIBLE_ITEMS = 2.5;
const MIN_ALBUMS = 8;
const MAX_ALBUMS = 10;

const getItemWidth = (width: number) => {
  const availableWidth = width - H_PADDING * 2;
  return (availableWidth - GAP * (VISIBLE_ITEMS - 1)) / VISIBLE_ITEMS;
};

export default function RecentlyAdded() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { albums } = useAlbums();
  const gridItemWidth = getItemWidth(width);

  const recentlyAdded = useMemo(() => {
    return [...albums]
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
      .slice(0, MAX_ALBUMS);
  }, [albums]);
  const coversToPrefetch = useMemo(() => recentlyAdded.map(album => album.cover), [recentlyAdded]);
  usePrefetchCovers(coversToPrefetch, 'grid');

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t('explore.sections.recentlyAdded')}
      </Text>
      {recentlyAdded.length < MIN_ALBUMS ? (
        <SectionEmptyState message={t('explore.empty.recentlyAdded')} />
      ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recentlyAdded.map((album) => (
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
    marginBottom: 12,
    marginLeft: H_PADDING,
  },
  scrollContent: {
    paddingHorizontal: H_PADDING,
  },
  item: {
    marginRight: GAP,
    minWidth: 0,
  },
});
