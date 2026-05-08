import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useAlbums } from '@/hooks/albums';
import { useTheme } from '@/hooks/useTheme';
import AlbumItem from '@/screens/home/components/Items/AlbumItem';
import SectionEmptyState from '../SectionEmptyState';
import { useTranslation } from 'react-i18next';
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers';

const H_PADDING = 12;
const GAP = 12;
const VISIBLE_ITEMS = 2.5;
const MAX_ALBUMS = 12;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const getItemWidth = (width: number) => {
  const availableWidth = width - H_PADDING * 2;
  return (availableWidth - GAP * (VISIBLE_ITEMS - 1)) / VISIBLE_ITEMS;
};

export default function RandomAlbums() {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const { albums } = useAlbums();
  const gridItemWidth = getItemWidth(width);

  const randomAlbums = useMemo(() => {
    if (albums.length === 0) return [];
    const shuffled = shuffle(albums);
    return shuffled.slice(0, Math.min(MAX_ALBUMS, albums.length));
  }, [albums]);
  const coversToPrefetch = useMemo(() => randomAlbums.map(album => album.cover), [randomAlbums]);
  usePrefetchCovers(coversToPrefetch, 'grid');

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        {t('explore.sections.randomAlbums')}
      </Text>
      {randomAlbums.length === 0 ? (
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
