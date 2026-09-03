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

import { usePlayingState, usePlayingActions } from '@/contexts/PlayingContext';
import { selectShowJumpButtons } from '@/utils/redux/selectors/settingsSelectors';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import Touchable from '@/components/Touchable';
import { spacing } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

const JUMP_SECONDS = 15;

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PlayPauseButton({ isPlaying, isBuffering, onPress }: { isPlaying: boolean; isBuffering: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const rad = useRadius();

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withTiming(0.91, { duration: 80 }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: 150 }); }}
      style={[styles.playButton, { borderRadius: rad.pill }, animStyle]}
    >
      {isBuffering
        ? <SpinningLoaderCircle size={18} color="#000" />
        : isPlaying
          ? <Pause size={26} color="#000" fill="#000" />
          : <Play size={26} color="#000" fill="#000" />
      }
    </AnimatedPressable>
  );
}

type ToggleBadge = 'none' | 'dot' | 'sparkle';

function ToggleButton({
  badge,
  onPress,
  children,
}: {
  badge: ToggleBadge;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const rad = useRadius();
  return (
    <View style={styles.toggleWrapper}>
      <Touchable onPress={onPress} hitSlop={HIT_SLOP}>
        {children}
      </Touchable>
      {badge !== 'none' && (
        <View style={styles.activeBadgeSlot}>
          {badge === 'dot'
            ? <View style={[styles.activeDot, { borderRadius: rad.pill }, styles.activeDotVisible]} />
            : <Sparkle size={9} color="#fff" fill="#fff" />
          }
        </View>
      )}
    </View>
  );
}

function JumpButton({ direction, onPress }: { direction: 'back' | 'forward'; onPress: () => void }) {
  const Icon = direction === 'back' ? RotateCcw : RotateCw;
  const label = direction === 'back' ? `−${JUMP_SECONDS}s` : `+${JUMP_SECONDS}s`;
  return (
    <Touchable
      accessibilityLabel={direction === 'back' ? `Jump back ${JUMP_SECONDS} seconds` : `Jump forward ${JUMP_SECONDS} seconds`}
      onPress={onPress}
      hitSlop={HIT_SLOP}
    >
      <View style={styles.jumpWrapper}>
        <Icon size={28} color="#fff" />
        <Text style={styles.jumpLabel} allowFontScaling={false}>{label}</Text>
      </View>
    </Touchable>
  );
}

const Controls: React.FC = () => {
  const { isPlaying, isBuffering, shuffleMode, repeatMode } = usePlayingState();
  const { pauseSong, resumeSong, skipToNext, skipToPrevious, cycleShuffleMode, toggleRepeat, jumpBy } = usePlayingActions();
  const showJumpButtons = useSelector(selectShowJumpButtons);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) pauseSong();
    else resumeSong();
  }, [isPlaying, pauseSong, resumeSong]);

  const handleJumpBack = useCallback(() => { jumpBy(-JUMP_SECONDS); }, [jumpBy]);
  const handleJumpForward = useCallback(() => { jumpBy(JUMP_SECONDS); }, [jumpBy]);

  return (
    <View style={styles.container}>
      <ToggleButton
        badge={shuffleMode === 'smart' ? 'sparkle' : shuffleMode === 'shuffle' ? 'dot' : 'none'}
        onPress={cycleShuffleMode}
      >
        <Shuffle size={23} color="#fff" />
      </ToggleButton>

      <Touchable onPress={skipToPrevious} hitSlop={HIT_SLOP}>
        <SkipBack size={34} color="#fff" fill="#fff" />
      </Touchable>

      {showJumpButtons && <JumpButton direction="back" onPress={handleJumpBack} />}

      <PlayPauseButton isPlaying={isPlaying} isBuffering={isBuffering} onPress={handlePlayPause} />

      {showJumpButtons && <JumpButton direction="forward" onPress={handleJumpForward} />}

      <Touchable onPress={skipToNext} hitSlop={HIT_SLOP}>
        <SkipForward size={34} color="#fff" fill="#fff" />
      </Touchable>

      <ToggleButton badge={repeatMode !== 'off' ? 'dot' : 'none'} onPress={toggleRepeat}>
        {repeatMode === 'one'
          ? <Repeat1 size={23} color="#fff" />
          : <Repeat size={23} color="#fff" />
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
    width: 68,
    height: 68,
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
  },
  jumpWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },
  jumpLabel: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default Controls;
