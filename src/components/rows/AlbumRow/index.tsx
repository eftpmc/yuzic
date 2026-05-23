import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ellipsis } from 'lucide-react-native';

import { AlbumBase } from '@/types';
import AlbumOptions from '@/components/options/AlbumOptions';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';
import { useSheetRef } from '@/utils/useSheetRef';

type Props = {
  album: AlbumBase;
  onPress?: (album: AlbumBase) => void;
};

const AlbumRow: React.FC<Props> = ({
  album,
  onPress,
}) => {
  const { colors } = useTheme();
  const optionsSheetRef = useSheetRef();

  const handlePress = useCallback(() => onPress?.(album), [onPress, album]);

  const handleOptionsPress = useCallback(() => {
    optionsSheetRef.current?.present();
  }, [optionsSheetRef]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.albumItem}>
        <TouchableOpacity
          style={styles.albumContent}
          onPress={handlePress}
        >
          <MediaImage
            cover={album.cover}
            size="grid"
            style={styles.cover}
          />

          <View style={styles.albumTextContainer}>
            <View style={styles.titleRow}>
              <Text
                numberOfLines={1}
                style={[styles.albumTitle, { color: colors.secondary }]}
              >
                {album.title}
              </Text>
            </View>

            <Text
              numberOfLines={1}
              style={[styles.albumSubtext, { color: colors.subtext }]}
            >
              {album.subtext}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            onPress={handleOptionsPress}
            style={styles.optionButton}
          >
            <Ellipsis
              size={24}
              color={colors.secondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <AlbumOptions
        ref={optionsSheetRef}
        album={album}
        hideGoToAlbum={false}
      />
    </View>
  );
};

export default memo(AlbumRow);

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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  albumSubtext: {
    fontSize: 14,
    marginTop: 2,
  },
  optionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionButton: {
    padding: 8,
  },
});
