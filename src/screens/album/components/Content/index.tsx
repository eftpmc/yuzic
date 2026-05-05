import React, { useMemo } from 'react';
import { Platform, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { Album, Song } from '@/types';

import AlbumHeader from '../Header';
import SongRow from '@/components/rows/SongRow';
import ListSeparator from '@/components/ListSeparator';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  album: Album;
};

type DiscHeader = { type: 'disc-header'; disc: number };
type SongItem = { type: 'song'; song: Song };
type ListItem = DiscHeader | SongItem;

const ESTIMATED_ROW_HEIGHT = 72;
const DISC_HEADER_HEIGHT = 36;

const AlbumContent: React.FC<Props> = ({ album }) => {
  const { isDarkMode } = useTheme();

  /**
   * Memoized header so FlashList doesn't recreate it unnecessarily
   */
  const header = useMemo(() => {
    return <AlbumHeader album={album} />;
  }, [album]);

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

    const song = item.song;
    const trackNum = song.trackNumber;

    return (
      <SongRow
        song={song}
        collection={album}
        variant="albumCompact"
        trackNumber={trackNum}
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
      ItemSeparatorComponent={({ leadingItem }) => {
        if (!leadingItem || leadingItem.type === 'disc-header') return null;
        return <ListSeparator variant="compact" />;
      }}
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
});

export default AlbumContent;
