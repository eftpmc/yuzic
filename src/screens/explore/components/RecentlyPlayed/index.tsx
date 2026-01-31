import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useSelector } from 'react-redux';
import {
  selectAlbumLastPlayedAt,
  selectArtistLastPlayedAt,
} from '@/utils/redux/selectors/statsSelectors';
import { useAlbums } from '@/hooks/albums';
import { useArtists } from '@/hooks/artists';
import { useTheme } from '@/hooks/useTheme';
import AlbumItem from '@/screens/home/components/Items/AlbumItem';
import ArtistItem from '@/screens/home/components/Items/ArtistItem';

const H_PADDING = 12;
const GAP = 12;
const ITEM_MARGIN = 4;
const VISIBLE_ITEMS = 2.08; // 2 full + sliver of third (close to original large size)

const getItemWidth = (width: number) => {
  const availableWidth = width - H_PADDING * 2;
  const slotWidth = (availableWidth - GAP * (VISIBLE_ITEMS - 1)) / VISIBLE_ITEMS;
  return slotWidth - ITEM_MARGIN * 2;
};

export default function RecentlyPlayed() {
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const gridItemWidth = getItemWidth(width);
  const slotWidth = gridItemWidth + ITEM_MARGIN * 2;
  const albumLastPlayedAt = useSelector(selectAlbumLastPlayedAt);
  const artistLastPlayedAt = useSelector(selectArtistLastPlayedAt);
  const { albums } = useAlbums();
  const { artists } = useArtists();

  const recentlyPlayed = useMemo(() => {
    const entries: { id: string; timestamp: number; type: 'Album' | 'Artist' }[] = [];

    Object.entries(albumLastPlayedAt).forEach(([id, timestamp]) => {
      if (timestamp > 0) entries.push({ id, timestamp, type: 'Album' });
    });
    Object.entries(artistLastPlayedAt).forEach(([id, timestamp]) => {
      if (timestamp > 0) entries.push({ id, timestamp, type: 'Artist' });
    });

    entries.sort((a, b) => b.timestamp - a.timestamp);
    return entries;
  }, [albumLastPlayedAt, artistLastPlayedAt]);

  const itemsToRender = useMemo(() => {
    return recentlyPlayed
      .map((entry) => {
        if (entry.type === 'Album') {
          const album = albums.find((a) => a.id === entry.id);
          if (!album) return null;
          return {
            type: 'Album' as const,
            id: album.id,
            title: album.title,
            subtext: album.subtext,
            cover: album.cover,
          };
        }
        const artist = artists.find((a) => a.id === entry.id);
        if (!artist) return null;
        return {
          type: 'Artist' as const,
          id: artist.id,
          name: artist.name,
          subtext: artist.subtext,
          cover: artist.cover,
        };
      })
      .filter(Boolean);
  }, [recentlyPlayed, albums, artists]);

  if (itemsToRender.length === 0) return null;

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        Recently played
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {itemsToRender.map((item) =>
          item.type === 'Album' ? (
            <View key={`album-${item.id}`} style={[styles.item, { width: slotWidth }]}>
              <AlbumItem
                id={item.id}
                title={item.title}
                subtext={item.subtext}
                cover={item.cover}
                isGridView
                gridWidth={gridItemWidth}
              />
            </View>
          ) : (
            <View key={`artist-${item.id}`} style={[styles.item, { width: slotWidth }]}>
              <ArtistItem
                id={item.id}
                name={item.name}
                subtext={item.subtext}
                cover={item.cover}
                isGridView
                gridWidth={gridItemWidth}
              />
            </View>
          )
        )}
      </ScrollView>
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
