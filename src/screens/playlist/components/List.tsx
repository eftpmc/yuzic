import React, { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';

import { PlaylistData, SongData } from '@/types';
import SongRow from '@/components/SongRow';

import Header from './Header';

type Props = {
  playlist: PlaylistData;
};

const ESTIMATED_ROW_HEIGHT = 72;

const List: React.FC<Props> = ({ playlist }) => {
  const songs = playlist.songs ?? [];

  const header = useMemo(() => {
    return <Header playlist={playlist} />;
  }, [playlist]);

  const renderItem = ({ item }: { item: SongData }) => (
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
      contentContainerStyle={{ paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default List;