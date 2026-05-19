import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { PlayCircle } from 'lucide-react-native';
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
  const { colors } = useTheme();
  const hasPreview = !!previewUrl;

  return (
    <View style={[styles.row, !hasPreview && styles.rowDisabled]}>
      <TouchableOpacity
        style={styles.songInfo}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={onPress ? 0.6 : 1}
      >
        <View style={styles.textContainer}>
          <Text
            style={[styles.title, { color: colors.secondary }, !hasPreview && styles.textDisabled]}
            numberOfLines={1}
          >
            {song.title}
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.subtext }, !hasPreview && styles.textDisabled]}
            numberOfLines={1}
          >
            {song.artist || albumArtist}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.rowRight}>
        {hasPreview && (
          <PlayCircle size={16} color={colors.subtext} />
        )}
        <ExternalSongOptions
          song={song}
          albumTitle={albumTitle}
          albumArtist={albumArtist}
          onPlay={previewUrl ? onPress : undefined}
        />
      </View>
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
  rowDisabled: {
    opacity: 0.4,
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
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '400',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  textDisabled: {
    opacity: 1,
  },
});
