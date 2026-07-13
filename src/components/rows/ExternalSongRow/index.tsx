import React, { memo, useCallback } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { PlayCircle } from 'lucide-react-native';
import { toast } from '@backpackapp-io/react-native-toast';
import { useTranslation } from 'react-i18next';
import { ExternalSong } from '@/types';
import { useTheme } from '@/hooks/useTheme';
import MediaListRow from '@/components/MediaListRow';
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
    <MediaListRow
      title={song.title}
      subtitle={song.artist || albumArtist}
      cover={song.cover}
      onPress={handlePress}
      showCover={false}
      variant="compact"
      contentStyle={styles.content}
      rowStyle={styles.row}
      trailing={
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
      }
    />
  );
};

export default memo(ExternalSongRow);

const styles = StyleSheet.create({
  row: {
    paddingVertical: 13,
  },
  content: {
    marginRight: 12,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
