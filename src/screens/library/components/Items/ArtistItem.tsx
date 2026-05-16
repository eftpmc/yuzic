import React, { memo, useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Artist, CoverSource } from '@/types';
import ArtistOptions from '@/components/options/ArtistOptions';
import { useSheetRef } from '@/utils/useSheetRef';
import { prefetchCovers } from '@/utils/images/imageCache';
import LibraryItem from './LibraryItem';

interface ItemProps {
  artist?: Artist;
  id: string;
  name: string;
  subtext: string;
  cover: CoverSource;
  isGridView: boolean;
  gridWidth: number;
  gridSpacing?: number;
}

const ArtistItem: React.FC<ItemProps> = ({
  artist,
  id,
  name,
  subtext,
  cover,
  isGridView,
  gridWidth,
  gridSpacing,
}) => {
  const navigation = useNavigation<any>();
  const sheetRef = useSheetRef();

  const artistForOptions = useMemo(() => artist ?? {
    id,
    name,
    subtext,
    cover,
    albumIds: [],
  }, [artist, cover, id, name, subtext]);

  const handlePress = useCallback(() => {
    prefetchCovers([cover], 'detail');
    navigation.navigate('artistView', { id });
  }, [cover, navigation, id]);

  const handleLongPress = useCallback(() => {
    sheetRef.current?.present();
  }, [sheetRef]);

  return (
    <>
      <LibraryItem
        cover={cover}
        title={name}
        subtext={subtext}
        isGridView={isGridView}
        gridWidth={gridWidth}
        gridSpacing={gridSpacing}
        circularImage
        onPress={handlePress}
        onLongPress={handleLongPress}
      />
      <ArtistOptions ref={sheetRef} artist={artistForOptions} hideGoToArtist={false} />
    </>
  );
};

export default memo(ArtistItem);
