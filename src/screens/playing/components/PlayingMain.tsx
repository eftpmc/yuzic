import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Slider from '@react-native-community/slider';
import TrackPlayer from 'react-native-track-player';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { useProgress } from 'react-native-track-player';
import { usePlaying } from '@/contexts/PlayingContext';
import { buildCover } from '@/utils/builders/buildCover';
import { CoverSource } from '@/types';
import { CirclePlus } from 'lucide-react-native';

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

const PlayingMain: React.FC<PlayingMainProps> = ({
  width,
  onPressArtist,
  onPressOptions,
  onPressAdd
}) => {
  const { currentSong } = usePlaying();
  const { position } = useProgress(250);

  const duration = currentSong ? Number(currentSong.duration) : 1;

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);

  if (!currentSong) {
    return null;
  }

  const coverUri =
    buildCover(currentSong.cover, 'detail') ??
    buildCover({ kind: 'none' } as CoverSource, 'detail');

  const handleSeekChange = (value: number) => {
    if (!isSeeking) setIsSeeking(true);
    setSeekPosition(value);
  };

  const handleSeekComplete = async (value: number) => {
    setSeekPosition(value);
    await TrackPlayer.seekTo(value);
    setTimeout(() => setIsSeeking(false), 200);
  };

  return (
    <View style={[styles.root, { width }]}>
      <Image
        source={{ uri: coverUri }}
        style={[styles.cover, { width, height: width }]}
        cachePolicy="memory-disk"
        priority="high"
        transition={300}
      />

      <View style={styles.titleRow}>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {currentSong.title}
          </Text>

          {currentSong.artist && (
            <TouchableOpacity
              onPress={onPressArtist}
              activeOpacity={0.7}
            >
              <Text style={styles.artist} numberOfLines={1}>
                {currentSong.artist}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View>
          <TouchableOpacity
          onPress={onPressAdd}
          style={styles.optionsButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <CirclePlus
            size={28}
            color="#fff"
          />
        </TouchableOpacity>
        </View>
      </View>

      <Slider
        style={styles.slider}
        value={isSeeking ? seekPosition : position}
        minimumValue={0}
        maximumValue={duration}
        minimumTrackTintColor="#fff"
        maximumTrackTintColor="#888"
        thumbTintColor="#fff"
        onValueChange={handleSeekChange}
        onSlidingComplete={handleSeekComplete}
      />

      <View style={styles.timestamps}>
        <Text style={styles.timestamp}>
          {formatTime(isSeeking ? seekPosition : position)}
        </Text>
        <Text style={styles.timestamp}>
          -{formatTime(duration - (isSeeking ? seekPosition : position))}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    alignSelf: 'center',
  },
  cover: {
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#111',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  artist: {
    fontSize: 14,
    color: '#ccc',
  },
  optionsButton: {
    padding: 6,
  },
  slider: {
    height: 36,
  },
  timestamps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timestamp: {
    fontSize: 12,
    color: '#bbb',
  },
});

export default PlayingMain;