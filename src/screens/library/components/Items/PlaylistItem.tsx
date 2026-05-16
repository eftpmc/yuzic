import React, { memo, useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { CoverSource, PlaylistBase } from '@/types';
import PlaylistOptions from '@/components/options/PlaylistOptions';
import { useSheetRef } from '@/utils/useSheetRef';
import { prefetchCovers } from '@/utils/images/imageCache';
import LibraryItem from './LibraryItem';

interface ItemProps {
  playlist?: PlaylistBase;
  id: string;
  title: string;
  subtext: string;
  cover: CoverSource;
  isGridView: boolean;
  gridWidth: number;
  gridSpacing?: number;
}

const PlaylistItem: React.FC<ItemProps> = ({
  playlist,
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

  const playlistForOptions = useMemo(() => playlist ?? {
    id,
    title,
    subtext,
    cover,
    changed: new Date(0),
    created: new Date(0),
  }, [cover, id, playlist, subtext, title]);

  const handlePress = useCallback(() => {
    prefetchCovers([cover], 'detail');
    navigation.navigate('playlistView', { id });
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
      <PlaylistOptions ref={sheetRef} playlist={playlistForOptions} hideGoToPlaylist={false} />
    </>
  );
};

export default memo(PlaylistItem);
