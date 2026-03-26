import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { Playlist, Song } from '@/types';
import SongRow from '@/components/rows/SongRow';
import ListSeparator from '@/components/ListSeparator';

import Header from '../Header';

type Props = {
  playlist: Playlist;
};

const ESTIMATED_ROW_HEIGHT = 72;

const PlaylistContent: React.FC<Props> = ({ playlist }) => {
  const songs = playlist.songs ?? [];

  const header = useMemo(() => {
    return <Header playlist={playlist} />;
  }, [playlist]);

  const renderItem = ({ item, index }: { item: Song; index: number }) => (
    <SongRow
      song={item}
      collection={playlist}
      selectedIndex={index}
      showDownloadedDot
    />
  );

  return (
    <FlashList<Song>
      data={songs}
      keyExtractor={(item, index) => `${item.id}:${index}`}
      renderItem={renderItem}
      {...({ estimatedItemSize: ESTIMATED_ROW_HEIGHT } as any)}
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <ListSeparator variant="compact" />}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 220 : 140 }}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default PlaylistContent;