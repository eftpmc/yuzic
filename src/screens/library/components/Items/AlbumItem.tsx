import React, { memo, useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { AlbumBase, CoverSource } from '@/types';
import AlbumOptions from '@/components/options/AlbumOptions';
import { useSheetRef } from '@/utils/useSheetRef';
import { prefetchCovers } from '@/utils/images/imageCache';
import LibraryItem from './LibraryItem';

interface ItemProps {
  album?: AlbumBase;
  id: string;
  title: string;
  subtext: string;
  cover: CoverSource;
  isGridView: boolean;
  gridWidth: number;
  gridSpacing?: number;
}

const AlbumItem: React.FC<ItemProps> = ({
  album,
  id,
  title,
  subtext,
  cover,
  isGridView,
  gridWidth,
  gridSpacing,
}) => {
  const navigation = useNavigation<any>();
  const sheetRef = useSheetRef();

  const albumForOptions = useMemo(() => album ?? {
    id,
    title,
    subtext,
    cover,
    artist: { id: '', name: subtext, cover: { kind: 'none' as const }, subtext: '' },
    year: 0,
    genres: [],
    created: new Date(0),
  }, [album, cover, id, subtext, title]);

  const handlePress = useCallback(() => {
    prefetchCovers([cover], 'detail');
    navigation.navigate('albumView', { id });
  }, [cover, navigation, id]);

  const handleLongPress = useCallback(() => {
    sheetRef.current?.present();
  }, [sheetRef]);

  return (
    <>
      <LibraryItem
        cover={cover}
        title={title}
        subtext={subtext}
        isGridView={isGridView}
        gridWidth={gridWidth}
        gridSpacing={gridSpacing}
        onPress={handlePress}
        onLongPress={handleLongPress}
      />
      <AlbumOptions ref={sheetRef} album={albumForOptions} hideGoToAlbum={false} />
    </>
  );
};

export default memo(AlbumItem);
