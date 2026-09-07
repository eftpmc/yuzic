import React, { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { toast } from '@backpackapp-io/react-native-toast';
import { getBackend } from '@/features/player/activeBackend';
import { useDispatch, useSelector } from 'react-redux';
import { useApi } from '@/api';
import SettingsScreen from '../components/SettingsScreen';
import SettingsToggleGroup from '../components/SettingsToggleGroup';
import SettingsCard from '../components/SettingsCard';
import SettingsCardHeader from '../components/SettingsCardHeader';
import SettingsRow from '../components/SettingsRow';
import StreamingQuality from './components/StreamingQuality';
import EngineSmokeTest from './EngineSmokeTest';
import {
  selectPreferredCodec,
  selectShowSleepTimer,
  selectShowPlaybackSpeed,
  selectShowJumpButtons,
  selectShowVolumeSlider,
  selectAutoplayEnabled,
  selectUseYuzicEngine,
  selectResumeLongTracksEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import { selectIsAudiomuseConfigured } from '@/utils/redux/selectors/audiomuseSelectors';
import {
  setPreferredCodec,
  setShowSleepTimer,
  setShowPlaybackSpeed,
  setShowJumpButtons,
  setShowVolumeSlider,
  setAutoplayEnabled,
  setUseYuzicEngine,
  setResumeLongTracksEnabled,
} from '@/utils/redux/slices/settingsSlice';

const PlayerSettings: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const api = useApi();
  const preferredCodec = useSelector(selectPreferredCodec);
  const showSleepTimer = useSelector(selectShowSleepTimer);
  const showPlaybackSpeed = useSelector(selectShowPlaybackSpeed);
  const showJumpButtons = useSelector(selectShowJumpButtons);
  const showVolumeSlider = useSelector(selectShowVolumeSlider);
  const autoplayEnabled = useSelector(selectAutoplayEnabled);
  const useYuzicEngine = useSelector(selectUseYuzicEngine);
  const resumeLongTracks = useSelector(selectResumeLongTracksEnabled);
  const isAudiomuseConfigured = useSelector(selectIsAudiomuseConfigured);
  // Presence, not provider: a server whose adapter declares Opus gets the
  // switch, whichever server it is.
  const supportsOpus = api.songs.streamableCodecs.includes('opus');

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
      label: t('settings.player.showJumpButtons'),
      subtext: t('settings.player.showJumpButtonsSubtext'),
      value: showJumpButtons,
      onValueChange: (v: boolean) => dispatch(setShowJumpButtons(v)),
    },
    {
      label: t('settings.player.showVolumeSlider'),
      subtext: t('settings.player.showVolumeSliderSubtext'),
      value: showVolumeSlider,
      onValueChange: (v: boolean) => dispatch(setShowVolumeSlider(v)),
    },
  ], [t, showSleepTimer, showPlaybackSpeed, showJumpButtons, showVolumeSlider, dispatch]);

  const autoplayItems = useMemo(() => [
    {
      label: t('settings.player.autoplay'),
      subtext: isAudiomuseConfigured
        ? t('settings.player.autoplaySubtextAudiomuse')
        : t('settings.player.autoplaySubtextNative'),
      value: autoplayEnabled,
      onValueChange: (v: boolean) => dispatch(setAutoplayEnabled(v)),
    },
    // Long-form resume (audiobooks, DJ sets, podcast episodes). Off means
    // a paused 90-min mix restarts from the top next time. Podcast episodes
    // are always bookmarkable, so this toggle governs songs ≥ 20 minutes.
    {
      label: t('settings.player.resumeLongTracks'),
      subtext: t('settings.player.resumeLongTracksSubtext'),
      value: resumeLongTracks,
      onValueChange: (v: boolean) => dispatch(setResumeLongTracksEnabled(v)),
    },
  ], [t, isAudiomuseConfigured, autoplayEnabled, resumeLongTracks, dispatch]);

  /**
   * The engine switch, shown in release builds and not only under __DEV__.
   *
   * It has to be reachable on a real phone: everything yuzic-engine still owes
   * — behaviour over Bluetooth, through a route change, on hardware that gets
   * warm — cannot be answered on a simulator, and a build where the only way
   * to select it is a debug-gated row answers none of it.
   *
   * Deliberately not translated. Every other string here goes through i18n;
   * this one is a temporary switch on an experiment, and adding it to eleven
   * locale files would imply a permanence it has not earned.
   */
  const engineItems = useMemo(() => [
    {
      label: 'Use yuzic-engine (experimental)',
      subtext:
        'Play through the new audio engine instead of the current player. ' +
        'Crossfade and the equalizer only work here. Switching stops playback, ' +
        'and the engine has not run on Android — expect problems, and say what ' +
        'they were.',
      value: useYuzicEngine,
      onValueChange: (v: boolean) => dispatch(setUseYuzicEngine(v)),
    },
  ], [useYuzicEngine, dispatch]);

  // The stream cache is the player's own, and separate from downloads: it
  // fills itself as you listen so a re-listen doesn't refetch, and evicts
  // least-recently-used past its cap. There was no way to see it or empty it,
  // which matters on a device that is short of room — the Downloads screen
  // reports its size and this did not exist at all.
  const clearStreamCache = useCallback(() => {
    Alert.alert(
      t('settings.player.clearCacheTitle'),
      t('settings.player.clearCacheBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.player.clearCacheConfirm'),
          style: 'destructive',
          onPress: () => {
            try {
              // Through the backend, so this empties whichever player is
              // actually holding the audio. Called on TrackPlayer directly it
              // would clear rntp's cache while the engine kept its own.
              getBackend().clearCache();
              toast.success(t('settings.player.clearCacheDone'));
            } catch {
              toast.error(t('common.error.unexpected'));
            }
          },
        },
      ]
    );
  }, [t]);

  return (
    <SettingsScreen title={t('settings.player.title')}>
      <StreamingQuality />
      {supportsOpus && <SettingsToggleGroup items={opusItems} />}
      <SettingsToggleGroup items={playerControlItems} />
      <SettingsToggleGroup items={autoplayItems} />

      <SettingsCardHeader subtle title="Audio engine" />
      <SettingsToggleGroup items={engineItems} />

      <SettingsCardHeader subtle title={t('settings.player.cacheTitle')} />
      <SettingsCard>
        <SettingsRow
          label={t('settings.player.clearCache')}
          onPress={clearStreamCache}
        />
      </SettingsCard>

      <EngineSmokeTest />
    </SettingsScreen>
  );
};

export default PlayerSettings;
