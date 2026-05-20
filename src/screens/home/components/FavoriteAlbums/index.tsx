import React, { useMemo } from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { useAlbums } from '@/hooks/albums';
import { useStarredSongs } from '@/hooks/starred';
import { useTheme } from '@/hooks/useTheme';
import AlbumItem from '@/screens/library/components/Items/AlbumItem';
import SectionEmptyState from '../SectionEmptyState';
import { useTranslation } from 'react-i18next';
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers';
import { sectionStyles, getSectionItemWidth } from '../sectionStyles';

const MIN_ALBUMS = 8;
const MAX_ALBUMS = 10;

export default function FavoriteAlbums() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { albums } = useAlbums();
  const { songs: starredSongs } = useStarredSongs();
  const gridItemWidth = getSectionItemWidth(width);

  const favoriteAlbums = useMemo(() => {
    const albumFavoriteCount = new Map<string, number>();
    for (const song of starredSongs) {
      if (song.albumId) {
        albumFavoriteCount.set(song.albumId, (albumFavoriteCount.get(song.albumId) ?? 0) + 1);
      }
    }
    return [...albums]
      .filter(a => albumFavoriteCount.has(a.id))
      .sort((a, b) => {
        const countA = albumFavoriteCount.get(a.id) ?? 0;
        const countB = albumFavoriteCount.get(b.id) ?? 0;
        if (countB !== countA) return countB - countA;
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      })
      .slice(0, MAX_ALBUMS);
  }, [albums, starredSongs]);

  const coversToPrefetch = useMemo(() => favoriteAlbums.map(a => a.cover), [favoriteAlbums]);
  usePrefetchCovers(coversToPrefetch, 'grid');

  return (
    <View style={sectionStyles.container}>
      <Text style={[sectionStyles.title, { color: colors.secondary }]}>
        {t('explore.sections.favoriteAlbums')}
      </Text>
      {favoriteAlbums.length < MIN_ALBUMS ? (
        <SectionEmptyState message={t('explore.empty.favoriteAlbums')} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          contentContainerStyle={sectionStyles.scrollContent}
        >
          {favoriteAlbums.map(album => (
            <View key={album.id} style={[sectionStyles.item, { width: gridItemWidth }]}>
              <AlbumItem album={album} isGridView gridWidth={gridItemWidth} gridSpacing={0} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
