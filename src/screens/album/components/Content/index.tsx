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
  const songs = album.songs ?? [];

  const { items, isMultiDisc } = useMemo(() => {
    const discs = new Set(songs.map(s => s.disc ?? 1));
    const multiDisc = discs.size > 1;

    if (!multiDisc) {
      return {
        isMultiDisc: false,
        items: songs.map(s => ({ type: 'song' as const, song: s })),
      };
    }

    const grouped = new Map<number, Song[]>();
    for (const song of songs) {
      const disc = song.disc ?? 1;
      if (!grouped.has(disc)) grouped.set(disc, []);
      grouped.get(disc)!.push(song);
    }

    const result: ListItem[] = [];
    const sortedDiscs = Array.from(grouped.keys()).sort((a, b) => a - b);
    for (const disc of sortedDiscs) {
      result.push({ type: 'disc-header', disc });
      for (const song of grouped.get(disc)!) {
        result.push({ type: 'song', song });
      }
    }

    return { isMultiDisc: true, items: result };
  }, [songs]);

  const header = useMemo(() => <AlbumHeader album={album} />, [album]);

  const renderItem = ({ item, index }: { item: ListItem; index: number }) => {
    if (item.type === 'disc-header') {
      return (
        <Text style={[styles.discHeader, isDarkMode && styles.discHeaderDark]}>
          Disc {item.disc}
        </Text>
      );
    }

    const song = item.song;
    const trackNum = song.trackNumber ?? undefined;

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
      estimatedItemSize={ESTIMATED_ROW_HEIGHT}
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

export default AlbumContent;

const styles = StyleSheet.create({
  discHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#666',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },
  discHeaderDark: {
    color: '#aaa',
  },
});
