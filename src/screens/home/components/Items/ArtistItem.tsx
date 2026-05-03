import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { CoverSource } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import ArtistOptions from '@/components/options/ArtistOptions';
import { useTheme } from '@/hooks/useTheme';
import { useArtists } from '@/hooks/artists';
import { useSheetRef } from '@/utils/useSheetRef';

interface ItemProps {
  id: string;
  name: string;
  subtext: string;
  cover: CoverSource;
  isGridView: boolean;
  gridWidth: number;
  gridSpacing?: number;
}

const ArtistItem: React.FC<ItemProps> = ({
  id,
  name,
  subtext,
  cover,
  isGridView,
  gridWidth,
  gridSpacing = 8,
}) => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation<any>();
  const { artists } = useArtists();
  const artist = artists.find(a => a.id === id) ?? null;

  const sheetRef = useSheetRef();

  const handleNavigation = useCallback(() => {
    navigation.navigate('artistView', { id });
  }, [navigation, id]);

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
              ? { width: gridWidth, aspectRatio: 1, borderRadius: 8 }
              : { width: 50, height: 50, borderRadius: 4, marginRight: 12 }
          }
        />

        <View style={isGridView ? styles.gridTextContainer : styles.textContainer}>
          <Text
            style={[styles.title, isDarkMode && styles.titleDark]}
            numberOfLines={1}
          >
            {name}
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

      <ArtistOptions
        ref={sheetRef}
        artist={artist}
        hideGoToArtist={false}
      />
    </>
  );
};

export default ArtistItem;

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  gridItemContainer: {
    alignItems: 'flex-start',
    borderRadius: 8,
  },
  gridTextContainer: {
    marginTop: 4,
    width: '100%',
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  titleDark: {
    color: '#e6e6e6',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
  },
  subtextDark: {
    color: '#aaa',
  },
  pressed: {
    opacity: 0.9,
  },
});
