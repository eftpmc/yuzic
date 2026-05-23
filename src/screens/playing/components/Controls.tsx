import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Shuffle, SkipBack, SkipForward, Repeat, Repeat1, Play, Pause } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { usePlayingState, usePlayingActions } from '@/contexts/PlayingContext';

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PlayPauseButton({ isPlaying, isBuffering, onPress }: { isPlaying: boolean; isBuffering: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withTiming(0.91, { duration: 80 }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: 150 }); }}
      style={[styles.playButton, animStyle]}
    >
      {isBuffering
        ? <ActivityIndicator size="small" color="#000" />
        : isPlaying
          ? <Pause size={26} color="#000" fill="#000" />
          : <Play size={26} color="#000" fill="#000" />
      }
    </AnimatedPressable>
  );
}

function ToggleButton({
  active,
  onPress,
  children,
}: {
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.toggleWrapper}>
      <TouchableOpacity onPress={onPress} hitSlop={HIT_SLOP}>
        {children}
      </TouchableOpacity>
      <View style={[styles.activeDot, active && styles.activeDotVisible]} />
    </View>
  );
}

const Controls: React.FC = () => {
  const { isPlaying, isBuffering, shuffleOn, repeatMode } = usePlayingState();
  const { pauseSong, resumeSong, skipToNext, skipToPrevious, toggleShuffle, toggleRepeat } = usePlayingActions();

  const handlePlayPause = useCallback(() => {
    if (isPlaying) pauseSong();
    else resumeSong();
  }, [isPlaying, pauseSong, resumeSong]);

  return (
    <View style={styles.container}>
      <ToggleButton active={shuffleOn} onPress={toggleShuffle}>
        <Shuffle size={23} color="#fff" />
      </ToggleButton>

      <TouchableOpacity onPress={skipToPrevious} hitSlop={HIT_SLOP}>
        <SkipBack size={34} color="#fff" fill="#fff" />
      </TouchableOpacity>

      <PlayPauseButton isPlaying={isPlaying} isBuffering={isBuffering} onPress={handlePlayPause} />

      <TouchableOpacity onPress={skipToNext} hitSlop={HIT_SLOP}>
        <SkipForward size={34} color="#fff" fill="#fff" />
      </TouchableOpacity>

      <ToggleButton active={repeatMode !== 'off'} onPress={toggleRepeat}>
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
    paddingHorizontal: 4,
    marginTop: 8,
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleWrapper: {
    alignItems: 'center',
    minWidth: 28,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: -5,
  },
  activeDotVisible: {
    backgroundColor: '#fff',
  },
});

export default Controls;
