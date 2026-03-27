import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { selectAlbumLastPlayedAt } from '@/utils/redux/selectors/statsSelectors';
import { useAlbums } from '@/hooks/albums';
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

export default function RecentlyPlayed() {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const gridItemWidth = getItemWidth(width);
  const albumLastPlayedAt = useSelector(selectAlbumLastPlayedAt);
  const { albums } = useAlbums();

  const itemsToRender = useMemo(() => {
    const entries = Object.entries(albumLastPlayedAt)
      .filter(([, timestamp]) => timestamp > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 12);

    return entries
      .map(([id]) => albums.find((a) => a.id === id))
      .filter(Boolean) as { id: string; title: string; subtext: string; cover: any }[];
  }, [albumLastPlayedAt, albums]);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        {t('explore.sections.recentlyPlayed')}
      </Text>
      {itemsToRender.length === 0 ? (
        <SectionEmptyState message={t('explore.empty.recentlyPlayed')} />
      ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {itemsToRender.map((album) => (
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
