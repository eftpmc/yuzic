import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { Image } from 'expo-image';

import { usePlaying } from '@/contexts/PlayingContext';
import { buildCover } from '@/utils/builders/buildCover';
import { CoverSource } from '@/types';
import { CirclePlus } from 'lucide-react-native';
import { SeekableProgressBar } from './SeekableProgressBar';

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
  const { currentSong, progress } = usePlaying();
  const position = progress.position;
  const duration = currentSong ? Number(currentSong.duration) : 1;

  if (!currentSong) {
    return null;
  }

  const coverUri =
    buildCover(currentSong.cover, 'detail') ??
    buildCover({ kind: 'none' } as CoverSource, 'detail');

  const handleSeek = (positionSeconds: number) => {
    TrackPlayer.seekTo(positionSeconds);
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
            size={32}
            color="#fff"
          />
        </TouchableOpacity>
        </View>
      </View>

      <SeekableProgressBar
        value={position}
        duration={duration}
        onSeek={handleSeek}
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
  progressBar: {
    marginTop: 8,
  },
  timestamps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  timestamp: {
    fontSize: 12,
    color: '#bbb',
  },
});

export default PlayingMain;