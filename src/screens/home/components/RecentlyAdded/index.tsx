import React, { useCallback, useMemo } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAlbums } from '@/hooks/albums';
import AlbumItem from '@/screens/library/components/Items/AlbumItem';
import SectionEmptyState from '../SectionEmptyState';
import SectionShelfHeader from '../SectionShelfHeader';
import { useTranslation } from 'react-i18next';
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers';
import { sectionStyles, getSectionItemWidth } from '../sectionStyles';

const MIN_ALBUMS = 8;
const MAX_ALBUMS = 10;

export default function RecentlyAdded() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
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

  // The shelf stops at ten; the Library tab's recently-added collection is the
  // same albums in full, so the heading leads there rather than nowhere.
  const openAll = useCallback(
    () => navigation.push('libraryCollectionView', { type: 'recentlyAdded' }),
    [navigation]
  );

  return (
    <View style={sectionStyles.container}>
      <SectionShelfHeader
        testID="home-recently-added-see-all"
        title={t('explore.sections.recentlyAdded')}
        seeAllLabel={t('library.seeAll')}
        onSeeAll={openAll}
      />
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
