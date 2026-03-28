import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useAlbums } from '@/hooks/albums';
import { useStarredSongs } from '@/hooks/starred';
import { useTheme } from '@/hooks/useTheme';
import AlbumItem from '@/screens/home/components/Items/AlbumItem';
import SectionEmptyState from '../SectionEmptyState';
import { useTranslation } from 'react-i18next';

const H_PADDING = 12;
const GAP = 12;
const VISIBLE_ITEMS = 2.5;

const getItemWidth = (width: number) => {
  const availableWidth = width - H_PADDING * 2;
  return (availableWidth - GAP * (VISIBLE_ITEMS - 1)) / VISIBLE_ITEMS;
};

export default function FavoriteAlbums() {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const { albums } = useAlbums();
  const { songs: starredSongs } = useStarredSongs();
  const gridItemWidth = getItemWidth(width);

  const favoriteAlbums = useMemo(() => {
    const albumFavoriteCount = new Map<string, number>();
    for (const song of starredSongs) {
      if (song.albumId) {
        albumFavoriteCount.set(
          song.albumId,
          (albumFavoriteCount.get(song.albumId) ?? 0) + 1
        );
      }
    }
    return [...albums]
      .filter((a) => albumFavoriteCount.has(a.id))
      .sort((a, b) => {
        const countA = albumFavoriteCount.get(a.id) ?? 0;
        const countB = albumFavoriteCount.get(b.id) ?? 0;
        if (countB !== countA) return countB - countA;
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      })
      .slice(0, 12);
  }, [albums, starredSongs]);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        {t('explore.sections.favoriteAlbums')}
      </Text>
      {favoriteAlbums.length === 0 ? (
        <SectionEmptyState message={t('explore.empty.favoriteAlbums')} />
      ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {favoriteAlbums.map((album) => (
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
