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

const getItemWidth = (width: number) => {
  const availableWidth = width - H_PADDING * 2;
  const slotWidth = (availableWidth - GAP * (VISIBLE_ITEMS - 1)) / VISIBLE_ITEMS;
  return slotWidth - ITEM_MARGIN * 2;
};

export default function RecentlyAdded() {
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const { albums } = useAlbums();
  const gridItemWidth = getItemWidth(width);
  const slotWidth = gridItemWidth + ITEM_MARGIN * 2;

  const recentlyAdded = useMemo(() => {
    return [...albums]
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
      .slice(0, 12);
  }, [albums]);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        Recently added
      </Text>
      {recentlyAdded.length === 0 ? (
        <SectionEmptyState message="No albums in your library yet" />
      ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recentlyAdded.map((album) => (
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
