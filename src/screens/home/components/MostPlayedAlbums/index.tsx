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
    return [...albums]
      .filter(a => (albumPlayCounts[a.id] ?? 0) > 0)
      .sort((a, b) => (albumPlayCounts[b.id] ?? 0) - (albumPlayCounts[a.id] ?? 0))
      .slice(0, MAX_ALBUMS);
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
