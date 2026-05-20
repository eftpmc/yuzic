import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import TurboImage from 'react-native-turbo-image';

import TrackPlayer from '@rntp/player';
import { usePlayingState, usePlayingProgress } from '@/contexts/PlayingContext';
import { SeekableProgressBar } from './SeekableProgressBar';
import { useSelector } from 'react-redux';
import { selectShowQualityBadge } from '@/utils/redux/selectors/settingsSelectors';
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
  const { currentSong } = usePlayingState();
  const showQualityBadge = useSelector(selectShowQualityBadge);
  const progress = usePlayingProgress();
  const nativeDuration = progress.duration
  const songDuration = currentSong ? Number(currentSong.duration) : 1
  const duration = nativeDuration > 0 ? nativeDuration : songDuration
  const position = Math.min(progress.position, duration)

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

  const handleSeek = (positionSeconds: number) => {
    TrackPlayer.seekTo(positionSeconds);
  };

  return (
    <View style={[styles.root, { width }]}>
      {coverUri ? (
        <TurboImage
          source={{ uri: coverUri }}
          style={[styles.cover, { width, height: width }]}
          resizeMode="cover"
          cachePolicy="dataCache"
          fadeDuration={300}
        />
      ) : (
        <View style={[styles.cover, { width, height: width }]} />
      )}

      <View style={styles.titleRow}>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {currentSong.title}
          </Text>

          {currentSong.artist && (
            <TouchableOpacity onPress={onPressArtist} activeOpacity={0.7}>
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

      {showQualityBadge && qualityLabel && (
        <Text style={styles.qualityBadge} numberOfLines={1}>
          {qualityLabel}
        </Text>
      )}

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
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  artist: {
    fontSize: 14,
    color: '#ccc',
  },
  qualityBadge: {
    fontSize: 11,
    color: '#888',
    textAlign: 'left',
    marginBottom: 8,
    letterSpacing: 0.3,
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
