import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { useTheme } from '@/hooks/useTheme';
import { useIsOffline } from '@/hooks/useIsOffline';
import MediaTile from '@/screens/explore/components/MediaTile';
import * as deezer from '@/api/deezer';
import { QueryKeys } from '@/enums/queryKeys';
import type { Album, ExternalAlbumBase } from '@/types';

const H_PADDING = 16;
const TILE_GAP = 12;
const VISIBLE_TILES = 2.5;
const MAX_ALBUMS = 8;

async function fetchRecommendedAlbums(artistName: string): Promise<ExternalAlbumBase[]> {
  try {
    const artist = await deezer.resolveDeezerArtistByName(artistName);
    if (!artist) return [];

    const related = await deezer.getDeezerRelatedArtists(artist.id, 12);
    if (!related.length) return [];

    const albumGroups = await Promise.allSettled(
      related.map(a => deezer.getDeezerArtistAlbums(a.id, 2, a))
    );

    const groups = albumGroups
      .filter((result): result is PromiseFulfilledResult<ExternalAlbumBase[]> =>
        result.status === 'fulfilled'
      )
      .map(result => result.value)
      .filter(group => group.length > 0);

    const seen = new Set<string>();
    const albums: ExternalAlbumBase[] = [];

    for (let albumIndex = 0; albumIndex < 2; albumIndex++) {
      for (const group of groups) {
        if (albums.length >= MAX_ALBUMS) break;
        const album = group[albumIndex];
        if (!album) continue;
        if (!seen.has(album.id)) {
          seen.add(album.id);
          albums.push(album);
        }
      }
      if (albums.length >= MAX_ALBUMS) break;
    }

    return albums;
  } catch {
    return [];
  }
}

type Props = {
  album: Album;
};

const RecommendedAlbumsSection: React.FC<Props> = ({ album }) => {
  const { isDarkMode } = useTheme();
  const isOffline = useIsOffline();
  const navigation = useNavigation<any>();

  const screenWidth = Dimensions.get('window').width;
  const tileWidth = (screenWidth - H_PADDING * 2 - TILE_GAP * 2) / VISIBLE_TILES;

  const artistName = album.artist?.name;

  const { data, isLoading } = useQuery({
    queryKey: [QueryKeys.RecommendedAlbums, album.id, artistName],
    queryFn: () => fetchRecommendedAlbums(artistName!),
    enabled: !!artistName,
    staleTime: 1000 * 60 * 60 * 6,
    networkMode: 'online',
  });

  if (!artistName || isOffline) return null;
  if (isLoading) return <ActivityIndicator style={styles.loader} />;
  if (!data?.length) return null;

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
        {data.map(a => (
          <MediaTile
            key={a.id}
            cover={a.cover}
            title={a.title}
            subtitle={a.artist}
            size={tileWidth}
            radius={6}
            onPress={() => navigation.navigate('externalAlbumView', {
              source: a.externalSource,
              albumId: a.id,
            })}
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
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#666',
    paddingHorizontal: H_PADDING,
    marginBottom: 12,
  },
  titleDark: {
    color: '#888',
  },
  tileRow: {
    paddingHorizontal: H_PADDING,
    gap: TILE_GAP,
  },
  loader: {
    marginVertical: 24,
  },
});
