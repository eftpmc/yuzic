import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MediaImage } from '@/components/MediaImage';
import { CoverSource, Playlist } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { usePlaylist } from '@/hooks/playlists';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import PlaylistOptions from '@/components/options/PlaylistOptions';

interface ItemProps {
  id: string;
  title: string;
  subtext: string;
  cover: CoverSource;
  isGridView: boolean;
  gridWidth: number;
}

const PlaylistItem: React.FC<ItemProps> = ({
  id,
  title,
  subtext,
  cover,
  isGridView,
  gridWidth,
}) => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation<any>();
  const { playlist } = usePlaylist(id);

  const sheetRef = useRef<BottomSheetModal>(null);
  const [playlistForSheet, setPlaylistForSheet] = useState<Playlist | null>(null);

  const handleNavigation = useCallback(() => {
    navigation.navigate('playlistView', { id });
  }, [navigation, id]);

  const handleLongPress = useCallback(() => {
    if (!playlist) return;
    setPlaylistForSheet(playlist);
    sheetRef.current?.present();
  }, [playlist]);

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
              ? { width: gridWidth, aspectRatio: 1, borderRadius: 8 }
              : { width: 50, height: 50, borderRadius: 4, marginRight: 12 }
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

      <PlaylistOptions
        ref={sheetRef}
        playlist={playlistForSheet}
        hideGoToPlaylist={false}
      />
    </>
  );
};

export default PlaylistItem;

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
    alignItems: 'flex-start',
    borderRadius: 14,
  },
  gridTextContainer: {
    marginTop: 4,
    width: '100%',
  },
  textContainer: {
    flex: 1,
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
