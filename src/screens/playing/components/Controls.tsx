import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { usePlayingState, usePlayingActions } from '@/contexts/PlayingContext';

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PlayPauseButton({ isPlaying, onPress }: { isPlaying: boolean; onPress: () => void }) {
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
      <FontAwesome6
        name={isPlaying ? 'pause' : 'play'}
        size={26}
        color="#000"
        style={isPlaying ? undefined : styles.playIconNudge}
      />
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
  const { isPlaying, shuffleOn, repeatOn } = usePlayingState();
  const { pauseSong, resumeSong, skipToNext, skipToPrevious, toggleShuffle, toggleRepeat } = usePlayingActions();

  const handlePlayPause = useCallback(() => {
    if (isPlaying) pauseSong();
    else resumeSong();
  }, [isPlaying, pauseSong, resumeSong]);

  return (
    <View style={styles.container}>
      <ToggleButton active={shuffleOn} onPress={toggleShuffle}>
        <Ionicons name="shuffle" size={23} color="#fff" />
      </ToggleButton>

      <TouchableOpacity onPress={skipToPrevious} hitSlop={HIT_SLOP}>
        <Ionicons name="play-skip-back" size={34} color="#fff" />
      </TouchableOpacity>

      <PlayPauseButton isPlaying={isPlaying} onPress={handlePlayPause} />

      <TouchableOpacity onPress={skipToNext} hitSlop={HIT_SLOP}>
        <Ionicons name="play-skip-forward" size={34} color="#fff" />
      </TouchableOpacity>

      <ToggleButton active={repeatOn} onPress={toggleRepeat}>
        <Ionicons name="repeat" size={23} color="#fff" />
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
  playIconNudge: {
    marginLeft: 3,
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
