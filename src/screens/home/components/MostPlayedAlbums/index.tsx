import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { selectAlbumPlayCounts } from '@/utils/redux/selectors/statsSelectors';
import { useAlbums } from '@/hooks/albums';
import { useTheme } from '@/hooks/useTheme';
import AlbumItem from '@/screens/library/components/Items/AlbumItem';
import SectionEmptyState from '../SectionEmptyState';
import { useTranslation } from 'react-i18next';
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers';
import { AlbumBase } from '@/types';

const H_PADDING = 12;
const GAP = 12;
const VISIBLE_ITEMS = 2.5;
const MIN_ALBUMS = 4;
const MAX_ALBUMS = 10;

const getItemWidth = (width: number) => {
  const availableWidth = width - H_PADDING * 2;
  return (availableWidth - GAP * (VISIBLE_ITEMS - 1)) / VISIBLE_ITEMS;
};

export default function MostPlayedAlbums() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const gridItemWidth = getItemWidth(width);
  const albumPlayCounts = useSelector(selectAlbumPlayCounts);
  const { albums } = useAlbums();

  const itemsToRender = useMemo(() => {
    return [...albums]
      .filter((a) => (albumPlayCounts[a.id] ?? 0) > 0)
      .sort((a, b) => (albumPlayCounts[b.id] ?? 0) - (albumPlayCounts[a.id] ?? 0))
      .slice(0, MAX_ALBUMS) as AlbumBase[];
  }, [albumPlayCounts, albums]);

  const coversToPrefetch = useMemo(() => itemsToRender.map((a) => a.cover), [itemsToRender]);
  usePrefetchCovers(coversToPrefetch, 'grid');

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t('explore.sections.mostPlayed')}
      </Text>
      {itemsToRender.length < MIN_ALBUMS ? (
        <SectionEmptyState message={t('explore.empty.mostPlayed')} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {itemsToRender.map((album) => (
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
