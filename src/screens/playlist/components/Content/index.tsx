import React, { useMemo } from 'react';
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

  const renderItem = ({ item }: { item: Song }) => (
    <SongRow
      song={item}
      collection={playlist}
    />
  );

  return (
    <FlashList
      data={songs}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      estimatedItemSize={ESTIMATED_ROW_HEIGHT}
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <ListSeparator variant="compact" />}
      contentContainerStyle={{ paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default PlaylistContent;