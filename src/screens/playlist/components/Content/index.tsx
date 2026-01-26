import React, { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';

import { Playlist, Song } from '@/types';
import SongRow from '@/components/rows/SongRow';

import Header from '../Header';

type Props = {
  playlist: Playlist;
  onRefresh: () => void;
  isRefreshing: boolean;
};

const ESTIMATED_ROW_HEIGHT = 72;

const PlaylistContent: React.FC<Props> = ({ playlist, onRefresh, isRefreshing }) => {
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
      contentContainerStyle={{ paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
      onRefresh={onRefresh}
      refreshing={isRefreshing}
    />
  );
};

export default PlaylistContent;