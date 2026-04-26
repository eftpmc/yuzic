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

  /**
   * Memoized header so FlashList doesn't recreate it unnecessarily
   */
  const header = useMemo(() => {
    return <AlbumHeader album={album} />;
  }, [album]);

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
