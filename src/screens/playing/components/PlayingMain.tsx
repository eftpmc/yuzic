import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import TurboImage from 'react-native-turbo-image';

import { usePlayingState, usePlayingProgress, usePlayingActions } from '@/contexts/PlayingContext';
import { SeekableProgressBar } from './SeekableProgressBar';
import { useSelector } from 'react-redux';
import { selectShowQualityBadge } from '@/utils/redux/selectors/settingsSelectors';
import { buildCover } from '@/utils/builders/buildCover';
import { CoverSource } from '@/types';
import { CirclePlus } from 'lucide-react-native';
import Touchable from '@/components/Touchable';
import { spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

type PlayingMainProps = {
  width: number;
  onPressArtist?: () => void;
  onPressOptions?: () => void;
  onPressAdd?: () => void;
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Isolated so the once-a-second progress tick only re-renders the seek bar
// and timestamps, not the cover art / title / artist / add button above it —
// same reasoning as ProgressBarStrip in the mini player (PlayingBarBase).
const PlayingProgressSection: React.FC<{ songDuration: number }> = memo(({ songDuration }) => {
  const { seekSong } = usePlayingActions();
  const progress = usePlayingProgress();
  const nativeDuration = progress.duration;
  const duration = nativeDuration > 0 ? nativeDuration : songDuration;
  const position = Math.min(progress.position, duration);

  return (
    <>
      <SeekableProgressBar
        value={position}
        duration={duration}
        onSeek={seekSong}
        fillColor="#fff"
        trackColor="#555"
        style={styles.progressBar}
      />

      <View style={styles.timestamps}>
        <Text style={styles.timestamp}>
          {formatTime(position)}
        </Text>
        <Text style={styles.timestamp}>
          -{formatTime(duration - position)}
        </Text>
      </View>
    </>
  );
});
PlayingProgressSection.displayName = 'PlayingProgressSection';

const PlayingMain: React.FC<PlayingMainProps> = ({
  width,
  onPressArtist,
  onPressOptions,
  onPressAdd
}) => {
  const { currentSong } = usePlayingState();
  const rad = useRadius();
  const showQualityBadge = useSelector(selectShowQualityBadge);

  if (!currentSong) {
    return null;
  }

  const qualityLabel = (() => {
    const parts: string[] = [];
    if (currentSong.mimeType) {
      const fmt = currentSong.mimeType.split('/')[1]?.toUpperCase().replace('MPEG', 'MP3').replace('X-FLAC', 'FLAC') ?? '';
      if (fmt) parts.push(fmt);
    }
    if (currentSong.bitrate) parts.push(`${currentSong.bitrate}kbps`);
    else if (currentSong.sampleRate) parts.push(`${(currentSong.sampleRate / 1000).toFixed(1)}kHz`);
    return parts.join(' · ') || null;
  })();

  const coverUri =
    buildCover(currentSong.cover, 'detail') ??
    buildCover({ kind: 'none' } as CoverSource, 'detail');

  return (
    <View style={[styles.root, { width }]}>
      {coverUri ? (
        <TurboImage
          source={{ uri: coverUri }}
          style={[styles.cover, { width, height: width, borderRadius: rad.card }]}
          resizeMode="cover"
          cachePolicy="dataCache"
          fadeDuration={300}
        />
      ) : (
        <View style={[styles.cover, { width, height: width, borderRadius: rad.card }]} />
      )}

      <View style={styles.titleRow}>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {currentSong.title}
          </Text>

          {currentSong.artist && (
            <Touchable onPress={onPressArtist}>
              <Text style={styles.artist} numberOfLines={1}>
                {currentSong.artist}
              </Text>
            </Touchable>
          )}
        </View>

        <View>
          <Touchable
          onPress={onPressAdd}
          style={styles.optionsButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <CirclePlus
            size={32}
            color="#fff"
          />
        </Touchable>
        </View>
      </View>

      {showQualityBadge && qualityLabel && (
        <Text style={styles.qualityBadge} numberOfLines={1}>
          {qualityLabel}
        </Text>
      )}

      <PlayingProgressSection songDuration={Number(currentSong.duration)} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    alignSelf: 'center',
  },
  cover: {
    marginBottom: spacing.lg,
    backgroundColor: '#111',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  textContainer: {
    flex: 1,
    paddingRight: spacing.md,
  },
  title: {
    ...typography.sectionTitle,
    color: '#fff',
    marginBottom: spacing.xs,
  },
  artist: {
    ...typography.rowSubtitle,
    color: '#ccc',
  },
  qualityBadge: {
    ...typography.micro,
    color: '#888',
    textAlign: 'left',
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  optionsButton: {
    padding: spacing.tight,
  },
  progressBar: {
    marginTop: spacing.sm,
  },
  timestamps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.controlGap,
  },
  timestamp: {
    ...typography.caption,
    color: '#bbb',
  },
});

export default PlayingMain;
