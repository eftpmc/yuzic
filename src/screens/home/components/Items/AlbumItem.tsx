import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { usePlaying } from '@/contexts/PlayingContext';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { MediaImage } from '@/components/MediaImage';
import { Album, CoverSource } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { staleTime } from '@/constants/staleTime';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AlbumOptions from '@/components/options/AlbumOptions';

interface ItemProps {
  id: string;
  title: string;
  subtext: string;
  cover: CoverSource;
  isGridView: boolean;
  gridWidth: number;
}

const AlbumItem: React.FC<ItemProps> = ({
  id,
  title,
  subtext,
  cover,
  isGridView,
  gridWidth,
}) => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation<any>();
  const api = useApi();
  const queryClient = useQueryClient();

  const sheetRef = useRef<BottomSheetModal>(null);
  const [albumForSheet, setAlbumForSheet] = useState<Album | null>(null);

  const fetchAlbum = useCallback(async () => {
    return queryClient.fetchQuery({
      queryKey: [QueryKeys.Album, id],
      queryFn: () => api.albums.get(id),
      staleTime: staleTime.albums,
    });
  }, [api, queryClient, id]);

  const handleNavigation = useCallback(() => {
    navigation.navigate('albumView', { id });
  }, [navigation, id]);

  const handleLongPress = useCallback(async () => {
    const album = await fetchAlbum();
    if (!album) return;
    setAlbumForSheet(album);
    sheetRef.current?.present();
  }, [fetchAlbum]);

  return (
    <>
      <Pressable
        onPress={handleNavigation}
        onLongPress={handleLongPress}
        delayLongPress={300}
        style={({ pressed }) => [
          isGridView
            ? [styles.gridItemContainer, { width: gridWidth }]
            : styles.itemContainer,
          pressed && styles.pressed,
        ]}
      >
        <MediaImage
          cover={cover}
          size={isGridView ? 'grid' : 'thumb'}
          style={
            isGridView
              ? { width: gridWidth, aspectRatio: 1, borderRadius: 10 }
              : { width: 52, height: 52, borderRadius: 8, marginRight: 12 }
          }
        />

        <View
          style={isGridView ? styles.gridTextContainer : styles.textContainer}
        >
          <Text
            style={[styles.title, isDarkMode && styles.titleDark]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[styles.subtext, isDarkMode && styles.subtextDark]}
            numberOfLines={1}
          >
            {subtext}
          </Text>
        </View>
      </Pressable>

      <AlbumOptions
        ref={sheetRef}
        album={albumForSheet}
        hideGoToAlbum={false}
      />
    </>
  );
};

export default AlbumItem;

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
  },
  gridItemContainer: {
    marginVertical: 8,
    marginHorizontal: 8,
    borderRadius: 14,
  },
  gridTextContainer: {
    marginTop: 6,
    width: '100%',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  titleDark: {
    color: '#e6e6e6',
  },
  subtext: {
    fontSize: 13,
    color: '#666',
  },
  subtextDark: {
    color: '#aaa',
  },
  pressed: {
    opacity: 0.9,
  },
});
