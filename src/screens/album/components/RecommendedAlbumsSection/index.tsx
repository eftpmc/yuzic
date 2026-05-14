import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { useTheme } from '@/hooks/useTheme';
import { useAlbums } from '@/hooks/albums';
import { selectAlbumPlayCounts } from '@/utils/redux/selectors/statsSelectors';
import MediaTile from '@/screens/explore/components/MediaTile';
import type { Album, AlbumBase } from '@/types';

const H_PADDING = 16;
const TILE_GAP = 12;
const VISIBLE_TILES = 2.5;
const MAX_ALBUMS = 8;

type Props = {
  album: Album;
};

const RecommendedAlbumsSection: React.FC<Props> = ({ album }) => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation<any>();
  const { width: screenWidth } = useWindowDimensions();
  const tileWidth = (screenWidth - H_PADDING * 2 - TILE_GAP * 2) / VISIBLE_TILES;

  const { albums: allAlbums } = useAlbums();
  const playCounts = useSelector(selectAlbumPlayCounts);

  const albumGenres = useMemo(
    () => new Set((album.genres ?? []).map(g => g.toLowerCase().trim()).filter(Boolean)),
    [album.genres]
  );

  const recommended = useMemo<AlbumBase[]>(() => {
    if (albumGenres.size === 0) return [];

    return allAlbums
      .filter(a =>
        a.id !== album.id &&
        a.artist.id !== album.artist?.id &&
        (a.genres ?? []).some(g => albumGenres.has(g.toLowerCase().trim()))
      )
      .sort((a, b) => (playCounts[b.id] ?? 0) - (playCounts[a.id] ?? 0))
      .slice(0, MAX_ALBUMS);
  }, [allAlbums, album.id, album.artist?.id, albumGenres, playCounts]);

  if (recommended.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        Recommended
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tileRow}
      >
        {recommended.map(a => (
          <MediaTile
            key={a.id}
            cover={a.cover}
            title={a.title}
            subtitle={a.artist.name}
            size={tileWidth}
            radius={6}
            onPress={() => navigation.navigate('albumView', { id: a.id })}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default RecommendedAlbumsSection;

const styles = StyleSheet.create({
  section: {
    paddingTop: 24,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    paddingHorizontal: H_PADDING,
    marginBottom: 12,
  },
  titleDark: {
    color: '#fff',
  },
  tileRow: {
    paddingHorizontal: H_PADDING,
    gap: TILE_GAP,
  },
});
