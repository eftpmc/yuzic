import React, { memo, useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { AlbumBase } from '@/types';
import AlbumOptions from '@/components/options/AlbumOptions';
import { useSheetRef } from '@/utils/useSheetRef';
import { prefetchCovers } from '@/utils/images/imageCache';
import LibraryItem from './LibraryItem';

interface ItemProps {
  album: AlbumBase;
  isGridView: boolean;
  gridWidth: number;
  gridSpacing?: number;
}

const AlbumItem: React.FC<ItemProps> = ({ album, isGridView, gridWidth, gridSpacing }) => {
  const navigation = useNavigation<any>();
  const sheetRef = useSheetRef();
  const [optionsMounted, setOptionsMounted] = useState(false);

  const handlePress = useCallback(() => {
    prefetchCovers([album.cover], 'detail');
    navigation.navigate('albumView', { id: album.id });
  }, [album, navigation]);

  const handleLongPress = useCallback(() => {
    if (!optionsMounted) {
      setOptionsMounted(true);
      requestAnimationFrame(() => sheetRef.current?.present());
    } else {
      sheetRef.current?.present();
    }
  }, [optionsMounted, sheetRef]);

  return (
    <>
      <LibraryItem
        cover={album.cover}
        title={album.title}
        subtext={album.subtext}
        isGridView={isGridView}
        gridWidth={gridWidth}
        gridSpacing={gridSpacing}
        onPress={handlePress}
        onLongPress={handleLongPress}
      />
      {optionsMounted && <AlbumOptions ref={sheetRef} album={album} hideGoToAlbum={false} />}
    </>
  );
};

export default memo(AlbumItem);
