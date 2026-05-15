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
import { useTranslation } from 'react-i18next';

const CurrentlyPlaying: React.FC = () => {
  const { t } = useTranslation();
  const { isDarkMode, colors } = useTheme();
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
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <View style={styles.row}>
        <MediaImage
          cover={currentSong?.cover ?? { kind: 'none' }}
          size="thumb"
          style={styles.nowPlayingCover}
        />

        <View style={styles.info}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {currentSong?.title ?? t('settings.player.nothingPlaying')}
          </Text>

          <Text
            style={[styles.subtitle, { color: colors.subtext }]}
            numberOfLines={1}
          >
            {currentSong?.artist ?? t('settings.player.unknownArtist')}
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
                ? colors.subtext
                : shuffleOn
                  ? themeColor
                  : colors.subtext
            }
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={skipToPrevious} disabled={disabled}>
          <MaterialIcons
            name="skip-previous"
            size={28}
            color={disabled ? colors.subtext : colors.text}
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
            color={disabled ? colors.subtext : colors.text}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleRepeat} disabled={disabled}>
          <MaterialIcons
            name="repeat"
            size={24}
            color={
              disabled
                ? colors.subtext
                : repeatOn
                  ? themeColor
                  : colors.subtext
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
    marginBottom: 24,
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
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
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