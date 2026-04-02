import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { ExternalAlbum, ExternalSong } from '@/types';
import ExternalAlbumHeader from '../Header';
import ExternalSongRow from '@/components/rows/ExternalSongRow';
import ListSeparator from '@/components/ListSeparator';

type Props = {
  album: ExternalAlbum;
};

const ESTIMATED_ROW_HEIGHT = 72;

const ExternalAlbumContent: React.FC<Props> = ({ album }) => {
  const songs = album.songs ?? [];

  const header = useMemo(() => {
    return <ExternalAlbumHeader album={album} />;
  }, [album]);

  const renderItem = ({ item, index }: { item: ExternalSong; index: number }) => {
    return <ExternalSongRow song={item} trackNumber={index + 1} />;
  };

  return (
    <FlashList
      data={songs}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      estimatedItemSize={ESTIMATED_ROW_HEIGHT}
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <ListSeparator variant="compact" />}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 180 : 140 }}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default ExternalAlbumContent;
