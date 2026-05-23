import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ellipsis } from 'lucide-react-native';

import { PlaylistBase } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';
import PlaylistOptions from '@/components/options/PlaylistOptions';
import { useSheetRef } from '@/utils/useSheetRef';

type Props = {
  playlist: PlaylistBase;
  onPress?: (playlist: PlaylistBase) => void;
};

const PlaylistRow: React.FC<Props> = ({ playlist, onPress }) => {
  const { colors } = useTheme();
  const optionsSheetRef = useSheetRef();

  const handlePress = useCallback(() => onPress?.(playlist), [onPress, playlist]);

  const handleOptionsPress = useCallback(() => {
    optionsSheetRef.current?.present();
  }, [optionsSheetRef]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.rowItem}>
        <TouchableOpacity
          style={styles.rowContent}
          onPress={handlePress}
        >
          <MediaImage
            cover={playlist.cover}
            size="grid"
            style={styles.cover}
          />

          <View style={styles.textContainer}>
            <Text
              numberOfLines={1}
              style={[styles.title, { color: colors.secondary }]}
            >
              {playlist.title}
            </Text>

            <Text
              numberOfLines={1}
              style={[styles.subtext, { color: colors.subtext }]}
            >
              {playlist.subtext}
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

      <PlaylistOptions
        ref={optionsSheetRef}
        playlist={playlist}
        hideGoToPlaylist={false}
      />
    </View>
  );
};

export default memo(PlaylistRow);

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
  },
  cover: {
    width: 64,
    height: 64,
    borderRadius: 6,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  subtext: {
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
