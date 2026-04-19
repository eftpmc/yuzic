import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ExternalSong } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import ExternalSongOptions from '@/components/options/ExternalSongOptions';

type Props = {
  song: ExternalSong;
  trackNumber?: number;
  albumTitle: string;
  albumArtist: string;
  hasPreview?: boolean;
  onPress?: () => void;
};

const ExternalSongRow: React.FC<Props> = ({
  song,
  trackNumber,
  albumTitle,
  albumArtist,
  hasPreview = false,
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
        <View style={styles.leadingMeta}>
          <Text style={[styles.trackNumber, themeStyles.trackNumber]}>
            {String(trackNumber ?? '')}
          </Text>
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.title, themeStyles.title]} numberOfLines={1}>
            {song.title}
          </Text>
          {hasPreview && (
            <View style={styles.previewBadge}>
              <Ionicons name="headset-outline" size={10} color={isDarkMode ? '#666' : '#aaa'} />
              <Text style={[styles.previewText, themeStyles.previewText]}>preview</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <ExternalSongOptions
        song={song}
        albumTitle={albumTitle}
        albumArtist={albumArtist}
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
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  previewText: {
    fontSize: 10,
  },
});

const stylesLight = StyleSheet.create({
  title: { color: '#000' },
  trackNumber: { color: '#666' },
  previewText: { color: '#aaa' },
});

const stylesDark = StyleSheet.create({
  title: { color: '#fff' },
  trackNumber: { color: '#aaa' },
  previewText: { color: '#666' },
});
