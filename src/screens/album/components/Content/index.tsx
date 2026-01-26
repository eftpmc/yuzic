import React, { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';

import { Album, Song } from '@/types';

import AlbumHeader from '../Header';
import SongRow from '@/components/rows/SongRow';

type Props = {
  album: Album;
  onRefresh: () => void;
  isRefreshing: boolean;
};

const ESTIMATED_ROW_HEIGHT = 72;

const AlbumContent: React.FC<Props> = ({ album, onRefresh, isRefreshing }) => {
  const songs = album.songs ?? [];

  /**
   * Memoized header so FlashList doesn’t recreate it unnecessarily
   */
  const header = useMemo(() => {
    return <AlbumHeader album={album} />;
  }, [album]);

  const renderItem = ({ item }: { item: Song }) => {
    return (
      <SongRow
        song={item}
        collection={album}
      />
    );
  };

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

export default AlbumContent;