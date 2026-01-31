import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useAlbums } from '@/hooks/albums';
import { useTheme } from '@/hooks/useTheme';
import AlbumItem from '@/screens/home/components/Items/AlbumItem';
import SectionEmptyState from '../SectionEmptyState';

const H_PADDING = 12;
const GAP = 12;
const ITEM_MARGIN = 4;
const VISIBLE_ITEMS = 2.08; // 2 full + sliver of third
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
  const slotWidth = (availableWidth - GAP * (VISIBLE_ITEMS - 1)) / VISIBLE_ITEMS;
  return slotWidth - ITEM_MARGIN * 2;
};

export default function RandomAlbums() {
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const { albums } = useAlbums();
  const gridItemWidth = getItemWidth(width);
  const slotWidth = gridItemWidth + ITEM_MARGIN * 2;

  const randomAlbums = useMemo(() => {
    if (albums.length === 0) return [];
    const shuffled = shuffle(albums);
    return shuffled.slice(0, Math.min(MAX_ALBUMS, albums.length));
  }, [albums]);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        Random albums
      </Text>
      {randomAlbums.length === 0 ? (
        <SectionEmptyState message="No albums in your library yet" />
      ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {randomAlbums.map((album) => (
          <View key={album.id} style={[styles.item, { width: slotWidth }]}>
            <AlbumItem
              id={album.id}
              title={album.title}
              subtext={album.subtext}
              cover={album.cover}
              isGridView
              gridWidth={gridItemWidth}
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
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginLeft: H_PADDING,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleDark: {
    color: '#888',
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
