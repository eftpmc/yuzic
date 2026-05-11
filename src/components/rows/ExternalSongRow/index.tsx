import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ExternalSong } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import ExternalSongOptions from '@/components/options/ExternalSongOptions';

type Props = {
  song: ExternalSong;
  albumTitle: string;
  albumArtist: string;
  /** When provided, preview badge is shown and queue actions become available. */
  previewUrl?: string;
  onPress?: () => void;
};

const ExternalSongRow: React.FC<Props> = ({
  song,
  albumTitle,
  albumArtist,
  previewUrl,
  onPress,
}) => {
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
        <View style={styles.textContainer}>
          <Text style={[styles.title, themeStyles.title]} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={[styles.subtitle, themeStyles.subtitle]} numberOfLines={1}>
            {song.artist || albumArtist}
          </Text>
        </View>
      </TouchableOpacity>

      <ExternalSongOptions
        song={song}
        albumTitle={albumTitle}
        albumArtist={albumArtist}
        onPlay={previewUrl ? onPress : undefined}
      />
    </View>
  );
};

export default memo(ExternalSongRow);

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
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '400',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 1,
  },
});

const stylesLight = StyleSheet.create({
  title: { color: '#000' },
  subtitle: { color: '#666' },
});

const stylesDark = StyleSheet.create({
  title: { color: '#fff' },
  subtitle: { color: '#aaa' },
});
