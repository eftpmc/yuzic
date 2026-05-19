import React, { useMemo } from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { useAlbums } from '@/hooks/albums';
import { useTheme } from '@/hooks/useTheme';
import AlbumItem from '@/screens/library/components/Items/AlbumItem';
import SectionEmptyState from '../SectionEmptyState';
import { useTranslation } from 'react-i18next';
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers';
import { sectionStyles, getSectionItemWidth } from '../sectionStyles';

const MIN_ALBUMS = 8;
const MAX_ALBUMS = 10;

export default function RecentlyAdded() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { albums } = useAlbums();
  const gridItemWidth = getSectionItemWidth(width);

  const recentlyAdded = useMemo(() => {
    return [...albums]
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
      .slice(0, MAX_ALBUMS);
  }, [albums]);

  const coversToPrefetch = useMemo(() => recentlyAdded.map(a => a.cover), [recentlyAdded]);
  usePrefetchCovers(coversToPrefetch, 'grid');

  return (
    <View style={sectionStyles.container}>
      <Text style={[sectionStyles.title, { color: colors.secondary }]}>
        {t('explore.sections.recentlyAdded')}
      </Text>
      {recentlyAdded.length < MIN_ALBUMS ? (
        <SectionEmptyState message={t('explore.empty.recentlyAdded')} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          contentContainerStyle={sectionStyles.scrollContent}
        >
          {recentlyAdded.map(album => (
            <View key={album.id} style={[sectionStyles.item, { width: gridItemWidth }]}>
              <AlbumItem album={album} isGridView gridWidth={gridItemWidth} gridSpacing={0} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
