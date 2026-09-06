import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Shuffle, Sparkle, SkipBack, SkipForward, Repeat, Repeat1, Play, Pause, RotateCcw, RotateCw } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { usePlayingState, usePlayingActions } from '@/contexts/PlayingContext';
import { selectShowJumpButtons } from '@/utils/redux/selectors/settingsSelectors';
import { canJumpWithin } from '@/utils/playback/contentKind';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import Touchable from '@/components/Touchable';
import { cappedTypography, controlSize, fontScaleCap, hitSlopFor, iconSize, onDark, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import haptics from '@/utils/haptics';

const JUMP_SECONDS = 15;

const HIT_SLOP = hitSlopFor(iconSize.control);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PlayPauseButton({ isPlaying, isBuffering, onPress }: { isPlaying: boolean; isBuffering: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const rad = useRadius();
  const reduced = useReducedMotion();

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? t('a11y.player.pause') : t('a11y.player.play')}
      onPress={onPress}
      onPressIn={() => { if (!reduced) scale.value = withTiming(0.91, { duration: 80 }); }}
      onPressOut={() => { if (!reduced) scale.value = withTiming(1, { duration: 150 }); }}
      style={[styles.playButton, { borderRadius: rad.pillFor(controlSize.playerPrimary) }, animStyle]}
    >
      {isBuffering
        ? <SpinningLoaderCircle size={iconSize.row} color="#000" />
        : isPlaying
          ? <Pause size={iconSize.loader} color="#000" fill="#000" />
          : <Play size={iconSize.loader} color="#000" fill="#000" />
      }
    </AnimatedPressable>
  );
}

type ToggleBadge = 'none' | 'dot' | 'sparkle';

/**
 * Shuffle and repeat, on and off.
 *
 * Both used to draw at full white in either state, so the only thing saying
 * shuffle was on was the 4pt dot under the icon — which is a confirmation of a
 * signal, not a signal. Dimming the off state gives the icon itself something
 * to say, and leaves the dot doing the job it is good at.
 */
function toggleColor(active: boolean): string {
  return active ? onDark.text : onDark.subtext;
}

/**
 * A control with more than two states says which one it is in through
 * `accessibilityValue`, not through its label: "Shuffle, smart shuffle" reads
 * as one control in a named mode, where a label that changed with the mode
 * would read as a different button each time the user cycled it.
 */
function ToggleButton({
  badge,
  label,
  value,
  active,
  onPress,
  children,
}: {
  badge: ToggleBadge;
  label: string;
  value: string;
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const rad = useRadius();
  return (
    <View style={styles.toggleWrapper}>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value }}
        accessibilityState={{ selected: active }}
        onPress={onPress}
        hitSlop={HIT_SLOP}
      >
        {children}
      </Touchable>
      {badge !== 'none' && (
        <View style={styles.activeBadgeSlot}>
          {badge === 'dot'
            ? <View style={[styles.activeDot, { borderRadius: rad.pill }, styles.activeDotVisible]} />
            : <Sparkle size={iconSize.marker} color={onDark.text} fill={onDark.text} />
          }
        </View>
      )}
    </View>
  );
}

function JumpButton({ direction, onPress }: { direction: 'back' | 'forward'; onPress: () => void }) {
  const { t } = useTranslation();
  const Icon = direction === 'back' ? RotateCcw : RotateCw;
  const label = direction === 'back' ? `−${JUMP_SECONDS}s` : `+${JUMP_SECONDS}s`;
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={t(
        direction === 'back' ? 'a11y.player.jumpBack' : 'a11y.player.jumpForward',
        { seconds: JUMP_SECONDS }
      )}
      onPress={onPress}
      hitSlop={HIT_SLOP}
    >
      <View style={styles.jumpWrapper}>
        <Icon size={iconSize.large} color={onDark.text} />
        <Text style={styles.jumpLabel} maxFontSizeMultiplier={fontScaleCap.glyph}>{label}</Text>
      </View>
    </Touchable>
  );
}

const Controls: React.FC = () => {
  const { t } = useTranslation();
  const { isPlaying, isBuffering, shuffleMode, repeatMode, currentSong } = usePlayingState();
  const { pauseSong, resumeSong, skipToNext, skipToPrevious, cycleShuffleMode, toggleRepeat, jumpBy } = usePlayingActions();
  const showJumpButtons = useSelector(selectShowJumpButtons);
  // Jump 15s within a live stream has nothing to skip past — a radio station
  // has no internal position. Hide the buttons on that kind rather than let
  // them look tappable and do nothing.
  const canJump = canJumpWithin(currentSong);

  const handlePlayPause = useCallback(() => {
    haptics.primary();
    if (isPlaying) pauseSong();
    else resumeSong();
  }, [isPlaying, pauseSong, resumeSong]);

  const handleSkipNext = useCallback(() => { haptics.tap(); skipToNext(); }, [skipToNext]);
  const handleSkipPrev = useCallback(() => { haptics.tap(); skipToPrevious(); }, [skipToPrevious]);
  const handleShuffle = useCallback(() => { haptics.selection(); cycleShuffleMode(); }, [cycleShuffleMode]);
  const handleRepeat = useCallback(() => { haptics.selection(); toggleRepeat(); }, [toggleRepeat]);
  const handleJumpBack = useCallback(() => { haptics.tap(); jumpBy(-JUMP_SECONDS); }, [jumpBy]);
  const handleJumpForward = useCallback(() => { haptics.tap(); jumpBy(JUMP_SECONDS); }, [jumpBy]);

  return (
    <View style={styles.container}>
      <ToggleButton
        badge={shuffleMode === 'smart' ? 'sparkle' : shuffleMode === 'shuffle' ? 'dot' : 'none'}
        label={t('a11y.player.shuffle')}
        value={t(`a11y.player.shuffleMode.${shuffleMode}`)}
        active={shuffleMode !== 'off'}
        onPress={handleShuffle}
      >
        <Shuffle size={iconSize.header} color={toggleColor(shuffleMode !== 'off')} />
      </ToggleButton>

      <Touchable
        accessibilityRole="button"
        accessibilityLabel={t('a11y.player.previous')}
        onPress={handleSkipPrev}
        hitSlop={HIT_SLOP}
      >
        <SkipBack size={iconSize.transport} color={onDark.text} fill={onDark.text} />
      </Touchable>

      {showJumpButtons && canJump && <JumpButton direction="back" onPress={handleJumpBack} />}

      <PlayPauseButton isPlaying={isPlaying} isBuffering={isBuffering} onPress={handlePlayPause} />

      {showJumpButtons && canJump && <JumpButton direction="forward" onPress={handleJumpForward} />}

      <Touchable
        accessibilityRole="button"
        accessibilityLabel={t('a11y.player.next')}
        onPress={handleSkipNext}
        hitSlop={HIT_SLOP}
      >
        <SkipForward size={iconSize.transport} color={onDark.text} fill={onDark.text} />
      </Touchable>

      <ToggleButton
        badge={repeatMode !== 'off' ? 'dot' : 'none'}
        label={t('a11y.player.repeat')}
        value={t(`a11y.player.repeatMode.${repeatMode}`)}
        active={repeatMode !== 'off'}
        onPress={handleRepeat}
      >
        {repeatMode === 'one'
          ? <Repeat1 size={iconSize.header} color={toggleColor(true)} />
          : <Repeat size={iconSize.header} color={toggleColor(repeatMode !== 'off')} />
        }
      </ToggleButton>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },
  playButton: {
    width: controlSize.playerPrimary,
    height: controlSize.playerPrimary,
    backgroundColor: onDark.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleWrapper: {
    alignItems: 'center',
    minWidth: 28,
  },
  activeBadgeSlot: {
    position: 'absolute',
    bottom: -5,
    width: 4,
    height: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    backgroundColor: 'transparent',
  },
  activeDotVisible: {
    backgroundColor: onDark.text,
  },
  jumpWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },
  jumpLabel: {
    ...cappedTypography.glyph.micro,
    color: onDark.text,
    fontWeight: '600',
    marginTop: spacing.xxs,
  },
});

export default Controls;
