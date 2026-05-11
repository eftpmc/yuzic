import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { MediaImage } from '@/components/MediaImage';
import { CoverSource } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import AlbumOptions from '@/components/options/AlbumOptions';
import { useAlbum } from '@/hooks/albums';
import { useSheetRef } from '@/utils/useSheetRef';
import { prefetchCovers } from '@/utils/images/imageCache';

interface ItemProps {
  id: string;
  title: string;
  subtext: string;
  cover: CoverSource;
  isGridView: boolean;
  gridWidth: number;
  gridSpacing?: number;
}

const AlbumItem: React.FC<ItemProps> = ({
  id,
  title,
  subtext,
  cover,
  isGridView,
  gridWidth,
  gridSpacing = 8,
}) => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation<any>();
  const { album } = useAlbum(id);

  const sheetRef = useSheetRef();

  const handleNavigation = useCallback(() => {
    prefetchCovers([cover], 'detail');
    navigation.navigate('albumView', { id });
  }, [cover, navigation, id]);

  const handleLongPress = useCallback(() => {
    sheetRef.current?.present();
  }, [sheetRef]);

  return (
    <>
      <Pressable
        onPress={handleNavigation}
        onLongPress={handleLongPress}
        delayLongPress={300}
        style={({ pressed }) => [
          isGridView
            ? [styles.gridItemContainer, { width: gridWidth, marginHorizontal: gridSpacing, marginVertical: gridSpacing }]
            : styles.itemContainer,
          pressed && styles.pressed,
        ]}
      >
        <MediaImage
          cover={cover}
          size={isGridView ? 'grid' : 'thumb'}
          style={
            isGridView
              ? { width: gridWidth, aspectRatio: 1, borderRadius: 6 }
              : { width: 52, height: 52, borderRadius: 4, marginRight: 12 }
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

        {!isGridView && (
          <TouchableOpacity
            onPress={() => { void handleLongPress(); }}
            hitSlop={10}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={18}
              color={isDarkMode ? '#fff' : '#000'}
            />
          </TouchableOpacity>
        )}
      </Pressable>

      <AlbumOptions
        ref={sheetRef}
        album={album}
        hideGoToAlbum={false}
      />
    </>
  );
};

export default memo(AlbumItem);

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  gridItemContainer: {
    borderRadius: 8,
  },
  gridTextContainer: {
    marginTop: 6,
    width: '100%',
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
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
