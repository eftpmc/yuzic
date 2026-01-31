import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { ExternalSong } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  song: ExternalSong;
  onPress?: () => void;
};

const ExternalSongRow: React.FC<Props> = ({ song, onPress }) => {
  const { isDarkMode } = useTheme();
  const themeStyles = isDarkMode ? stylesDark : stylesLight;

  const formatDuration = (duration?: string | number) => {
    if (!duration) return '';
    const total = Number(duration);
    const minutes = Math.floor(total / 60);
    const seconds = Math.floor(total % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={styles.songInfo}>
        <MediaImage
          cover={song.cover}
          size="thumb"
          style={styles.cover}
        />

        <View style={styles.textContainer}>
          <Text
            style={[styles.title, themeStyles.title]}
            numberOfLines={1}
          >
            {song.title}
          </Text>

          <Text
            style={[styles.subtitle, themeStyles.subtitle]}
            numberOfLines={1}
          >
            {song.artist} • {formatDuration(song.duration)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ExternalSongRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  songInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '400',
  },
  subtitle: {
    fontSize: 13,
  },
});

const stylesLight = StyleSheet.create({
  title: {
    color: '#000',
  },
  subtitle: {
    color: '#666',
  },
});

const stylesDark = StyleSheet.create({
  title: {
    color: '#fff',
  },
  subtitle: {
    color: '#aaa',
  },
});
