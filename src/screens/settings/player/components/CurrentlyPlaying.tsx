import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MediaImage } from '@/components/MediaImage';
import { usePlaying } from '@/contexts/PlayingContext';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';

const CurrentlyPlaying: React.FC = () => {
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);

  const {
    currentSong,
    isPlaying,
    pauseSong,
    resumeSong,
    skipToNext,
    skipToPrevious,
    toggleRepeat,
    toggleShuffle,
    repeatOn,
    shuffleOn,
  } = usePlaying();

  const disabled = !currentSong;

  return (
    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
      <View style={styles.row}>
        <MediaImage
          cover={currentSong?.cover ?? { kind: 'none' }}
          size="thumb"
          style={styles.nowPlayingCover}
        />

        <View style={styles.info}>
          <Text
            style={[styles.title, isDarkMode && styles.titleDark]}
            numberOfLines={1}
          >
            {currentSong?.title ?? 'Nothing playing'}
          </Text>

          <Text
            style={[styles.subtitle, isDarkMode && styles.subtitleDark]}
            numberOfLines={1}
          >
            {currentSong?.artist ?? '—'}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity onPress={toggleShuffle} disabled={disabled}>
          <MaterialIcons
            name="shuffle"
            size={24}
            color={
              disabled
                ? '#555'
                : shuffleOn
                  ? themeColor
                  : isDarkMode
                    ? '#888'
                    : '#aaa'
            }
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={skipToPrevious} disabled={disabled}>
          <MaterialIcons
            name="skip-previous"
            size={28}
            color={disabled ? '#555' : isDarkMode ? '#fff' : '#000'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={isPlaying ? pauseSong : resumeSong}
          disabled={disabled}
          style={styles.playButton}
        >
          <MaterialIcons
            name={isPlaying ? 'pause' : 'play-arrow'}
            size={28}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={skipToNext} disabled={disabled}>
          <MaterialIcons
            name="skip-next"
            size={28}
            color={disabled ? '#555' : isDarkMode ? '#fff' : '#000'}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleRepeat} disabled={disabled}>
          <MaterialIcons
            name="repeat"
            size={24}
            color={
              disabled
                ? '#555'
                : repeatOn
                  ? themeColor
                  : isDarkMode
                    ? '#888'
                    : '#aaa'
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CurrentlyPlaying;

const styles = StyleSheet.create({
  section: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 24,
  },
  sectionDark: {
    backgroundColor: '#111',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  titleDark: {
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
    color: '#666',
  },
  subtitleDark: {
    color: '#999',
  },
  nowPlayingCover: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
  },
  controls: {
    marginTop: 16,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: '#444',
    padding: 12,
    borderRadius: 32,
  },
});