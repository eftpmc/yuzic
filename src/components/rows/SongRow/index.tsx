import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';

import { Song } from '@/types';
import SongOptions from '@/components/options/SongOptions';
import { usePlaying } from '@/contexts/PlayingContext';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  song: Song;
  collection?: any;
  onPress?: () => void;
};

const SongRow: React.FC<Props> = ({ song, collection, onPress }) => {
  const { isDarkMode } = useTheme();
  const { playSongInCollection } = usePlaying();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    if (collection) {
      playSongInCollection(song, collection);
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '';

    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.songInfo}
        onPress={handlePress}
        disabled={!onPress && !collection}
      >
        <MediaImage
          cover={song.cover}
          size="thumb"
          style={styles.cover}
        />

        <View style={styles.textContainer}>
          <Text style={styles.title(isDarkMode)} numberOfLines={1}>
            {song.title}
          </Text>

          <Text style={styles.subtitle(isDarkMode)} numberOfLines={1}>
            {song.artist || 'Unknown'} • {formatDuration(Number(song.duration))}
          </Text>
        </View>
      </TouchableOpacity>

      <SongOptions selectedSong={song} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  songInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cover: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: (isDark: boolean) => ({
    fontSize: 16,
    fontWeight: '400',
    color: isDark ? '#fff' : '#000',
  }),
  subtitle: (isDark: boolean) => ({
    fontSize: 14,
    color: isDark ? '#aaa' : '#666',
  }),
});

export default SongRow;