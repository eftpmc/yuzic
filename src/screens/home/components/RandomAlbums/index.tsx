import React, { useMemo } from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { useAlbums } from '@/hooks/albums';
import { useTheme } from '@/hooks/useTheme';
import AlbumItem from '@/screens/library/components/Items/AlbumItem';
import SectionEmptyState from '../SectionEmptyState';
import { useTranslation } from 'react-i18next';
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers';
import { getDayKey, getDailySeed, seededShuffle } from '@/features/home/hooks/useDailyLayout';
import { sectionStyles, getSectionItemWidth } from '../sectionStyles';

const MIN_ALBUMS = 8;
const MAX_ALBUMS = 10;

type Props = { refreshKey?: number }

export default function RandomAlbums({ refreshKey = 0 }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { albums } = useAlbums();
  const gridItemWidth = getSectionItemWidth(width);
  const dayKey = getDayKey();
  const dailySeed = getDailySeed(dayKey) + refreshKey * 2147483647;

  const randomAlbums = useMemo(() => {
    if (albums.length === 0) return [];
    return seededShuffle(albums, dailySeed).slice(0, Math.min(MAX_ALBUMS, albums.length));
  }, [albums, dailySeed]);

  const coversToPrefetch = useMemo(() => randomAlbums.map(a => a.cover), [randomAlbums]);
  usePrefetchCovers(coversToPrefetch, 'grid');

  return (
    <View style={sectionStyles.container}>
      <Text style={[sectionStyles.title, { color: colors.secondary }]}>
        {t('explore.sections.randomAlbums')}
      </Text>
      {randomAlbums.length < MIN_ALBUMS ? (
        <SectionEmptyState message={t('explore.empty.randomAlbums')} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          contentContainerStyle={sectionStyles.scrollContent}
        >
          {randomAlbums.map(album => (
            <View key={album.id} style={[sectionStyles.item, { width: gridItemWidth }]}>
              <AlbumItem album={album} isGridView gridWidth={gridItemWidth} gridSpacing={0} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
