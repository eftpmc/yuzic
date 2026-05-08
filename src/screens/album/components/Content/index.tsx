import React, { useMemo } from 'react';
import { Platform, Text, View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';

import { Album, Song } from '@/types';

import AlbumHeader from '../Header';
import RecommendedAlbumsSection from '../RecommendedAlbumsSection';
import SongRow from '@/components/rows/SongRow';
import MediaTile from '@/screens/explore/components/MediaTile';
import { useTheme } from '@/hooks/useTheme';
import { useArtist } from '@/hooks/artists';
import { useStarredSongs } from '@/hooks/starred';

type Props = {
  album: Album;
};

type DiscHeader = { type: 'disc-header'; disc: number };
type SongItem = { type: 'song'; song: Song };
type ListItem = DiscHeader | SongItem;

const ESTIMATED_ROW_HEIGHT = 72;
const DISC_HEADER_HEIGHT = 36;
const H_PADDING = 16;
const TILE_GAP = 12;
const VISIBLE_TILES = 2.5;

const AlbumContent: React.FC<Props> = ({ album }) => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation<any>();
  const { artist: fullArtist } = useArtist(album.artist?.id ?? '');
  const { songs: starredSongs } = useStarredSongs();

  const screenWidth = Dimensions.get('window').width;
  const tileWidth = (screenWidth - H_PADDING * 2 - TILE_GAP * 2) / VISIBLE_TILES;
  const starredSongIds = useMemo(
    () => new Set(starredSongs.map(song => song.id)),
    [starredSongs]
  );

  const header = useMemo(() => {
    return <AlbumHeader album={album} />;
  }, [album]);

  const moreAlbums = useMemo(() => {
    return (fullArtist?.ownedAlbums ?? []).filter(a => a.id !== album.id);
  }, [fullArtist?.ownedAlbums, album.id]);

  const footer = useMemo(() => {
    const songs = album.songs ?? [];
    const totalSec = songs.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const duration = hrs > 0 ? `${hrs} hr ${mins} min` : `${mins} min`;
    const label = songs.length === 1 ? 'song' : 'songs';
    return (
      <View>
        <View style={styles.statsFooter}>
          <Text style={[styles.statsText, isDarkMode ? styles.statsTextDark : styles.statsTextLight]}>
            {songs.length} {label} · {duration}
          </Text>
        </View>
        {moreAlbums.length > 0 && (
          <View style={styles.moreSection}>
            <Text style={[styles.moreSectionTitle, isDarkMode && styles.moreSectionTitleDark]}>
              More by {album.artist?.name}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.moreTileRow}
            >
              {moreAlbums.map(a => (
                <MediaTile
                  key={a.id}
                  cover={a.cover}
                  title={a.title}
                  subtitle={a.subtext || String(a.year || '')}
                  size={tileWidth}
                  radius={6}
                  onPress={() => navigation.navigate('albumView', { id: a.id })}
                />
              ))}
            </ScrollView>
          </View>
        )}
        <RecommendedAlbumsSection album={album} />
      </View>
    );
  }, [album.songs, album.artist, isDarkMode, moreAlbums, tileWidth, navigation]);

  const items = useMemo<ListItem[]>(() => {
    const songs = album.songs ?? [];
    const hasMultipleDiscs = new Set(songs.map((song) => song.disc ?? 1)).size > 1;

    if (!hasMultipleDiscs) {
      return songs.map((song) => ({ type: 'song', song }));
    }

    const listItems: ListItem[] = [];
    let currentDisc: number | null = null;

    songs.forEach((song) => {
      const disc = song.disc ?? 1;

      if (disc !== currentDisc) {
        currentDisc = disc;
        listItems.push({ type: 'disc-header', disc });
      }

      listItems.push({ type: 'song', song });
    });

    return listItems;
  }, [album.songs]);

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'disc-header') {
      return (
        <Text style={[styles.discHeader, isDarkMode ? styles.discHeaderDark : styles.discHeaderLight]}>
          Disc {item.disc}
        </Text>
      );
    }

    return (
      <SongRow
        song={item.song}
        collection={album}
        variant="albumCompact"
        isFavorite={starredSongIds.has(item.song.id)}
      />
    );
  };

  return (
    <FlashList
      data={items}
      keyExtractor={(item) =>
        item.type === 'disc-header' ? `disc-${item.disc}` : item.song.id
      }
      renderItem={renderItem}
      getItemType={(item) => item.type}
      overrideItemLayout={(layout, item) => {
        (layout as { size?: number }).size =
          item.type === 'disc-header' ? DISC_HEADER_HEIGHT : ESTIMATED_ROW_HEIGHT;
      }}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 180 : 140 }}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  discHeader: {
    height: DISC_HEADER_HEIGHT,
    paddingHorizontal: 16,
    paddingTop: 14,
    fontSize: 13,
    fontWeight: '600',
  },
  discHeaderLight: {
    color: '#6b6b70',
  },
  discHeaderDark: {
    color: '#a7a7ad',
  },
  statsFooter: {
    paddingHorizontal: H_PADDING,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statsText: {
    fontSize: 13,
  },
  statsTextLight: {
    color: '#8e8e93',
  },
  statsTextDark: {
    color: '#666',
  },
  moreSection: {
    paddingTop: 24,
    paddingBottom: 8,
  },
  moreSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    paddingHorizontal: H_PADDING,
    marginBottom: 12,
  },
  moreSectionTitleDark: {
    color: '#fff',
  },
  moreTileRow: {
    paddingHorizontal: H_PADDING,
    gap: TILE_GAP,
  },
});

export default AlbumContent;
