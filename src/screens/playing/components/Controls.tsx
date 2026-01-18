import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { usePlaying } from '@/contexts/PlayingContext';

const Controls: React.FC = () => {
  const {
    isPlaying,
    pauseSong,
    resumeSong,
    skipToNext,
    skipToPrevious,
    shuffleOn,
    toggleShuffle,
    repeatOn,
    toggleRepeat,
  } = usePlaying();

  return (
    <View style={styles.container}>
      {/* Repeat */}
      <TouchableOpacity
        onPress={toggleRepeat}
        hitSlop={HIT_SLOP}
      >
        <Ionicons
          name="repeat"
          size={24}
          color={repeatOn ? '#fff' : '#777'}
        />
      </TouchableOpacity>

      {/* Previous */}
      <TouchableOpacity
        onPress={skipToPrevious}
        hitSlop={HIT_SLOP}
      >
        <Ionicons
          name="play-skip-back"
          size={28}
          color="#fff"
        />
      </TouchableOpacity>

      {/* Play / Pause */}
      <TouchableOpacity
        onPress={isPlaying ? pauseSong : resumeSong}
        hitSlop={HIT_SLOP}
      >
        <Ionicons
          name={isPlaying ? 'pause-circle' : 'play-circle'}
          size={80}
          color="#fff"
        />
      </TouchableOpacity>

      {/* Next */}
      <TouchableOpacity
        onPress={skipToNext}
        hitSlop={HIT_SLOP}
      >
        <Ionicons
          name="play-skip-forward"
          size={28}
          color="#fff"
        />
      </TouchableOpacity>

      {/* Shuffle */}
      <TouchableOpacity
        onPress={toggleShuffle}
        hitSlop={HIT_SLOP}
      >
        <Ionicons
          name="shuffle"
          size={24}
          color={shuffleOn ? '#fff' : '#777'}
        />
      </TouchableOpacity>
    </View>
  );
};

const HIT_SLOP = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,
    marginTop: 8,
  },
});

export default Controls;