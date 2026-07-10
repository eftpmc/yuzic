import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import SettingsScreen from '../components/SettingsScreen';
import SettingsToggleGroup from '../components/SettingsToggleGroup';
import StreamingQuality from './components/StreamingQuality';
import {
  selectCrossfadeDurationSeconds,
  selectCrossfadeEnabled,
  selectPreferredCodec,
  selectShowSleepTimer,
  selectShowPlaybackSpeed,
} from '@/utils/redux/selectors/settingsSelectors';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import {
  setCrossfadeEnabled,
  setCrossfadeDurationSeconds,
  setPreferredCodec,
  setShowSleepTimer,
  setShowPlaybackSpeed,
} from '@/utils/redux/slices/settingsSlice';
import { useTheme } from '@/hooks/useTheme';

const CROSSFADE_DURATION_MIN = 1;
const CROSSFADE_DURATION_MAX = 12;

const PlayerSettings: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const preferredCodec = useSelector(selectPreferredCodec);
  const activeServer = useSelector(selectActiveServer);
  const showSleepTimer = useSelector(selectShowSleepTimer);
  const showPlaybackSpeed = useSelector(selectShowPlaybackSpeed);
  const crossfadeEnabled = useSelector(selectCrossfadeEnabled);
  const crossfadeDurationSeconds = useSelector(selectCrossfadeDurationSeconds);
  const supportsOpus = activeServer?.type === 'jellyfin' || activeServer?.type === 'emby';

  const toggleOpus = useCallback((v: boolean) => { dispatch(setPreferredCodec(v ? 'opus' : 'mp3')); }, [dispatch]);
  const opusItems = useMemo(() => [{
    label: t('settings.player.opusCodec'),
    subtext: t('settings.player.opusCodecSubtext'),
    value: preferredCodec === 'opus',
    onValueChange: toggleOpus,
  }], [t, preferredCodec, toggleOpus]);

  const playerControlItems = useMemo(() => [
    {
      label: t('settings.player.showSleepTimer'),
      subtext: t('settings.player.showSleepTimerSubtext'),
      value: showSleepTimer,
      onValueChange: (v: boolean) => dispatch(setShowSleepTimer(v)),
    },
    {
      label: t('settings.player.showPlaybackSpeed'),
      subtext: t('settings.player.showPlaybackSpeedSubtext'),
      value: showPlaybackSpeed,
      onValueChange: (v: boolean) => dispatch(setShowPlaybackSpeed(v)),
    },
    {
      label: t('settings.player.crossfade'),
      subtext: t('settings.player.crossfadeSubtext', { seconds: crossfadeDurationSeconds }),
      value: crossfadeEnabled,
      onValueChange: (v: boolean) => dispatch(setCrossfadeEnabled(v)),
    },
  ], [t, showSleepTimer, showPlaybackSpeed, crossfadeEnabled, crossfadeDurationSeconds, dispatch]);

  const setCrossfadeDuration = useCallback((value: number) => {
    dispatch(setCrossfadeDurationSeconds(Math.round(value)));
  }, [dispatch]);

  return (
    <SettingsScreen title={t('settings.player.title')}>
      <StreamingQuality />
      {supportsOpus && <SettingsToggleGroup items={opusItems} />}
      <SettingsToggleGroup items={playerControlItems} />
      {crossfadeEnabled && (
        <View style={[styles.sliderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderLabel, { color: colors.secondary }]}>
              {t('settings.player.crossfadeDuration')}
            </Text>
            <Text style={[styles.sliderValue, { color: colors.themeColor }]}>
              {t('settings.player.crossfadeSeconds', { seconds: crossfadeDurationSeconds })}
            </Text>
          </View>
          <Slider
            value={crossfadeDurationSeconds}
            minimumValue={CROSSFADE_DURATION_MIN}
            maximumValue={CROSSFADE_DURATION_MAX}
            step={1}
            minimumTrackTintColor={colors.themeColor}
            maximumTrackTintColor={colors.muted}
            thumbTintColor={colors.themeColor}
            onValueChange={setCrossfadeDuration}
          />
          <View style={styles.sliderBounds}>
            <Text style={[styles.sliderBoundText, { color: colors.subtext }]}>
              {t('settings.player.crossfadeSeconds', { seconds: CROSSFADE_DURATION_MIN })}
            </Text>
            <Text style={[styles.sliderBoundText, { color: colors.subtext }]}>
              {t('settings.player.crossfadeSeconds', { seconds: CROSSFADE_DURATION_MAX })}
            </Text>
          </View>
        </View>
      )}
    </SettingsScreen>
  );
};

export default PlayerSettings;

const styles = StyleSheet.create({
  sliderCard: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sliderHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  sliderValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  sliderBounds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sliderBoundText: {
    fontSize: 12,
  },
});
