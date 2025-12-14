import React, { useMemo } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { AlbumData, SongData } from '@/types';

import AlbumHeader from './Header';
import SongRow from '@/components/SongRow';

type Props = {
  album: AlbumData;
};

const ESTIMATED_ROW_HEIGHT = 72;

const List: React.FC<Props> = ({ album }) => {
  const songs = album.songs ?? [];

  /**
   * Memoized header so FlashList doesn’t recreate it unnecessarily
   */
  const header = useMemo(() => {
    return <AlbumHeader album={album} />;
  }, [album]);

  const renderItem = ({ item }: { item: SongData }) => {
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
    />
  );
};

export default List;