import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useAlbums } from '@/hooks/albums';
import { useStarredSongs } from '@/hooks/starred';
import { useTheme } from '@/hooks/useTheme';
import AlbumItem from '@/screens/home/components/Items/AlbumItem';
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
      .slice(0, MAX_ALBUMS);
  }, [albums, starredSongs]);
  const coversToPrefetch = useMemo(() => favoriteAlbums.map(album => album.cover), [favoriteAlbums]);
  usePrefetchCovers(coversToPrefetch, 'grid');

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        {t('explore.sections.favoriteAlbums')}
      </Text>
      {favoriteAlbums.length < MIN_ALBUMS ? (
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
