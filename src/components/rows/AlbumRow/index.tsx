import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import { AlbumBase } from '@/types';
import AlbumOptions from '@/components/options/AlbumOptions';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';
import { useAlbum } from '@/hooks/albums';

type Props = {
  album: AlbumBase;
  onPress?: (album: AlbumBase) => void;
};

const AlbumRow: React.FC<Props> = ({ album, onPress }) => {
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const optionsSheetRef = useRef<BottomSheetModal>(null);
  const { album: fullAlbum } = useAlbum(album.id);

  return (
    <View style={styles.wrapper}>
      <View style={styles.albumItem}>
        <TouchableOpacity
          style={styles.albumContent}
          onPress={() => onPress?.(album)}
        >
          <MediaImage
            cover={album.cover}
            size="grid"
            style={styles.cover}
          />

          <View style={styles.albumTextContainer}>
            <Text
              numberOfLines={1}
              style={[
                styles.albumTitle,
                isDarkMode && styles.albumTitleDark,
              ]}
            >
              {album.title}
            </Text>

            <Text
              numberOfLines={1}
              style={[
                styles.albumSubtext,
                isDarkMode && styles.albumSubtextDark,
              ]}
            >
              {album.subtext}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            onPress={() => optionsSheetRef.current?.present()}
            style={styles.optionButton}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={24}
              color={isDarkMode ? '#fff' : '#000'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <AlbumOptions
        ref={optionsSheetRef}
        album={fullAlbum}
        hideGoToAlbum={false}
      />
    </View>
  );
};

export default AlbumRow;

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
  },
  cover: {
    width: 64,
    height: 64,
    borderRadius: 6,
  },
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  albumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  albumTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  albumTitleDark: {
    color: '#fff',
  },
  albumSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  albumSubtextDark: {
    color: '#aaa',
  },
  optionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionButton: {
    padding: 8,
  },
});