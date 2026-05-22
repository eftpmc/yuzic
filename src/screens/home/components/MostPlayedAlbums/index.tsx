import React, { useMemo } from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { selectAlbumPlayCounts } from '@/utils/redux/selectors/statsSelectors';
import { useAlbums } from '@/hooks/albums';
import { useTheme } from '@/hooks/useTheme';
import AlbumItem from '@/screens/library/components/Items/AlbumItem';
import SectionEmptyState from '../SectionEmptyState';
import { useTranslation } from 'react-i18next';
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers';
import { sectionStyles, getSectionItemWidth } from '../sectionStyles';

const MIN_ALBUMS = 4;
const MAX_ALBUMS = 10;

export default function MostPlayedAlbums() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const gridItemWidth = getSectionItemWidth(width);
  const albumPlayCounts = useSelector(selectAlbumPlayCounts);
  const { albums } = useAlbums();

  const itemsToRender = useMemo(() => {
    // Collect only albums that have been played, then sort that smaller set —
    // O(n) scan + O(k log k) sort where k = played albums, not O(n log n) over all.
    const withCounts: { album: typeof albums[0]; count: number }[] = [];
    for (const album of albums) {
      const count = albumPlayCounts[album.id] ?? 0;
      if (count > 0) withCounts.push({ album, count });
    }
    withCounts.sort((a, b) => b.count - a.count);
    return withCounts.slice(0, MAX_ALBUMS).map(x => x.album);
  }, [albumPlayCounts, albums]);

  const coversToPrefetch = useMemo(() => itemsToRender.map(a => a.cover), [itemsToRender]);
  usePrefetchCovers(coversToPrefetch, 'grid');

  return (
    <View style={sectionStyles.container}>
      <Text style={[sectionStyles.title, { color: colors.secondary }]}>
        {t('explore.sections.mostPlayed')}
      </Text>
      {itemsToRender.length < MIN_ALBUMS ? (
        <SectionEmptyState message={t('explore.empty.mostPlayed')} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          contentContainerStyle={sectionStyles.scrollContent}
        >
          {itemsToRender.map(album => (
            <View key={album.id} style={[sectionStyles.item, { width: gridItemWidth }]}>
              <AlbumItem album={album} isGridView gridWidth={gridItemWidth} gridSpacing={0} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
