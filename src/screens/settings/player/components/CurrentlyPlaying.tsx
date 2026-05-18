import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MediaImage } from '@/components/MediaImage';
import { usePlaying } from '@/contexts/PlayingContext';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import SettingsCard from '../../components/SettingsCard';

const CurrentlyPlaying: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

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
    <SettingsCard style={styles.card}>
      <View style={styles.row}>
        <MediaImage
          cover={currentSong?.cover ?? { kind: 'none' }}
          size="thumb"
          style={styles.cover}
        />
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={1}>
            {currentSong?.title ?? t('settings.player.nothingPlaying')}
          </Text>
          <Text style={[styles.artist, { color: colors.subtext }]} numberOfLines={1}>
            {currentSong?.artist ?? t('settings.player.unknownArtist')}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity onPress={toggleShuffle} disabled={disabled}>
          <MaterialIcons name="shuffle" size={24} color={disabled ? colors.subtext : shuffleOn ? colors.themeColor : colors.subtext} />
        </TouchableOpacity>

        <TouchableOpacity onPress={skipToPrevious} disabled={disabled}>
          <MaterialIcons name="skip-previous" size={28} color={disabled ? colors.subtext : colors.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={isPlaying ? pauseSong : resumeSong}
          disabled={disabled}
          style={[styles.playButton, { backgroundColor: colors.muted }]}
        >
          <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={28} color={disabled ? colors.subtext : colors.secondary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={skipToNext} disabled={disabled}>
          <MaterialIcons name="skip-next" size={28} color={disabled ? colors.subtext : colors.secondary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleRepeat} disabled={disabled}>
          <MaterialIcons name="repeat" size={24} color={disabled ? colors.subtext : repeatOn ? colors.themeColor : colors.subtext} />
        </TouchableOpacity>
      </View>
    </SettingsCard>
  );
};

export default CurrentlyPlaying;

const styles = StyleSheet.create({
  card: { padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cover: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  artist: {
    fontSize: 14,
    marginTop: 2,
  },
  controls: {
    marginTop: 16,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playButton: {
    padding: 12,
    borderRadius: 32,
  },
});
