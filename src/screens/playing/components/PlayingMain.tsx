import React, { memo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { usePlayingState, usePlayingProgress, usePlayingActions } from '@/contexts/PlayingContext';
import { SeekableProgressBar } from './SeekableProgressBar';
import { useSelector } from 'react-redux';
import { selectShowQualityBadge } from '@/utils/redux/selectors/settingsSelectors';
import { hasFiniteDuration } from '@/utils/playback/contentKind';
import { CirclePlus } from 'lucide-react-native';
import { usePlayerExpansion } from '@/features/player/PlayerExpansion';
import Touchable from '@/components/Touchable';
import { iconSize, onDark, spacing, typography } from '@/constants/design';
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
        fillColor={onDark.text}
        trackColor={onDark.mutedText}
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
  const { t } = useTranslation();
  const { currentSong } = usePlayingState();
  const rad = useRadius();
  const showQualityBadge = useSelector(selectShowQualityBadge);
  const { expansion, fullCover, scrollY } = usePlayerExpansion();

  // The cover itself is drawn by the player host, one layer up, so a single
  // image can travel between here and the playing bar instead of one being
  // swapped for another. What is left here is the hole it lands in, and the
  // job of telling the host where that hole is.
  const coverSlotRef = useRef<View>(null);
  const measureCoverSlot = useCallback(() => {
    coverSlotRef.current?.measureInWindow((x, y, slotWidth) => {
      if (slotWidth > 0) fullCover.value = { x, y, size: slotWidth };
    });
  }, [fullCover]);

  // Re-measure once the player has settled open: the lyrics preview and the
  // optional cards arrive after the first layout and can move this. Only from
  // the top, so the stored rect always means "where the slot sits unscrolled"
  // — which is the assumption the host's scroll correction is built on.
  useAnimatedReaction(
    () => expansion.value >= 1 && scrollY.value <= 0,
    (settled, wasSettled) => {
      if (settled && settled !== wasSettled) runOnJS(measureCoverSlot)();
    },
    [measureCoverSlot],
  );

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

  return (
    <View style={[styles.root, { width }]}>
      <View
        ref={coverSlotRef}
        onLayout={measureCoverSlot}
        // Keeps its surface colour rather than going transparent: the
        // travelling cover lands exactly on top of it, and a song whose
        // artwork will not load still has the plain square it always had
        // instead of a hole where the cover should be.
        style={[styles.cover, { width, height: width, borderRadius: rad.card }]}
      />

      <View style={styles.titleRow}>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {currentSong.title}
          </Text>

          {currentSong.artist && (
            <Touchable
              accessibilityRole="link"
              accessibilityHint={t('a11y.player.goToArtist')}
              onPress={onPressArtist}
            >
              <Text style={styles.artist} numberOfLines={1}>
                {currentSong.artist}
              </Text>
            </Touchable>
          )}
        </View>

        <View>
          <Touchable
          accessibilityRole="button"
          accessibilityLabel={t('a11y.player.addToPlaylist')}
          onPress={onPressAdd}
          style={styles.optionsButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <CirclePlus
            size={iconSize.large}
            color={onDark.text}
          />
        </Touchable>
        </View>
      </View>

      {showQualityBadge && qualityLabel && (
        <Text style={styles.qualityBadge} numberOfLines={1}>
          {qualityLabel}
        </Text>
      )}

      {/* Progress + timestamps only make sense for a finite piece of audio.
       * A radio station's position is meaningless, and the "-0:00 remaining"
       * label under an infinite stream reads as broken. */}
      {hasFiniteDuration(currentSong) && (
        <PlayingProgressSection songDuration={Number(currentSong.duration)} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    alignSelf: 'center',
  },
  cover: {
    marginBottom: spacing.lg,
    backgroundColor: onDark.surface,
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
    color: onDark.text,
    marginBottom: spacing.xs,
  },
  artist: {
    ...typography.rowSubtitle,
    color: onDark.subtext,
  },
  qualityBadge: {
    ...typography.micro,
    color: onDark.mutedText,
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
    color: onDark.subtext,
  },
});

export default PlayingMain;
