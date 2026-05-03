import React from 'react';
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
  trackNumber?: number;
  albumTitle: string;
  albumArtist: string;
  /** When provided, preview badge is shown and queue actions become available. */
  previewUrl?: string;
  /** @deprecated use previewUrl */
  hasPreview?: boolean;
  onPress?: () => void;
};

const ExternalSongRow: React.FC<Props> = ({
  song,
  trackNumber,
  albumTitle,
  albumArtist,
  previewUrl,
  hasPreview,
  onPress,
}) => {
  const { isDarkMode } = useTheme();
  const themeStyles = isDarkMode ? stylesDark : stylesLight;
  const isPreviewAvailable = !!previewUrl || !!hasPreview;

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
          <Text style={[styles.title, themeStyles.title]} numberOfLines={1}>
            {song.title}
          </Text>
        </View>
      </TouchableOpacity>

      <ExternalSongOptions
        song={song}
        albumTitle={albumTitle}
        albumArtist={albumArtist}
        onPlay={isPreviewAvailable ? onPress : undefined}
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
    width: 44,
    marginRight: 4,
    alignItems: 'flex-start',
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
  title: { color: '#000' },
  trackNumber: { color: '#666' },
});

const stylesDark = StyleSheet.create({
  title: { color: '#fff' },
  trackNumber: { color: '#aaa' },
});
