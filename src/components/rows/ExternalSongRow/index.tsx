import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { ExternalSong } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  song: ExternalSong;
  trackNumber?: number;
  onPress?: () => void;
};

const ExternalSongRow: React.FC<Props> = ({ song, trackNumber, onPress }) => {
  const { isDarkMode } = useTheme();
  const themeStyles = isDarkMode ? stylesDark : stylesLight;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.songInfo}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={onPress ? 0.6 : 1}
      >
        <View style={styles.leadingMeta}>
          <Text style={[styles.trackNumber, themeStyles.trackNumber]}>
            {String(trackNumber ?? '')}
          </Text>
        </View>

        <View style={styles.textContainer}>
          <Text
            style={[styles.title, themeStyles.title]}
            numberOfLines={1}
          >
            {song.title}
          </Text>
        </View>
      </TouchableOpacity>

      <Ionicons
        name="ellipsis-horizontal"
        size={18}
        color={isDarkMode ? '#fff' : '#000'}
      />
    </View>
  );
};

export default ExternalSongRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  songInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  leadingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 44,
    marginRight: 4,
  },
  trackNumber: {
    fontSize: 13,
    minWidth: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '400',
  },
});

const stylesLight = StyleSheet.create({
  title: {
    color: '#000',
  },
  trackNumber: {
    color: '#666',
  },
});

const stylesDark = StyleSheet.create({
  title: {
    color: '#fff',
  },
  trackNumber: {
    color: '#aaa',
  },
});
