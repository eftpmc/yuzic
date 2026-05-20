import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { PlayCircle } from 'lucide-react-native';
import { toast } from '@backpackapp-io/react-native-toast';
import { useTranslation } from 'react-i18next';
import { ExternalSong } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import ExternalSongOptions from '@/components/options/ExternalSongOptions';
import { useDeezerSamplesEnabled } from '@/features/home/hooks/useDeezerEnabled';

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
  const { t } = useTranslation();
  const samplesEnabled = useDeezerSamplesEnabled();
  const hasPreview = !!previewUrl;

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else if (!samplesEnabled) {
      toast(t('settings.deezer.enableSamplesToPreview'));
    }
  }, [onPress, samplesEnabled, t]);

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.songInfo}
        onPress={handlePress}
        activeOpacity={0.6}
      >
        <View style={styles.textContainer}>
          <Text
            style={[styles.title, { color: colors.secondary }]}
            numberOfLines={1}
          >
            {song.title}
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.subtext }]}
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
});
