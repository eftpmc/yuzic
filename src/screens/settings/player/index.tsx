import React, { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { toast } from '@backpackapp-io/react-native-toast';
import TrackPlayer from '@rntp/player';
import { useDispatch, useSelector } from 'react-redux';
import SettingsScreen from '../components/SettingsScreen';
import SettingsToggleGroup from '../components/SettingsToggleGroup';
import SettingsCard from '../components/SettingsCard';
import SettingsCardHeader from '../components/SettingsCardHeader';
import SettingsRow from '../components/SettingsRow';
import StreamingQuality from './components/StreamingQuality';
import {
  selectPreferredCodec,
  selectShowSleepTimer,
  selectShowPlaybackSpeed,
  selectShowJumpButtons,
  selectShowVolumeSlider,
  selectAutoplayEnabled,
  selectResumeLongTracksEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { selectIsAudiomuseConfigured } from '@/utils/redux/selectors/audiomuseSelectors';
import {
  setPreferredCodec,
  setShowSleepTimer,
  setShowPlaybackSpeed,
  setShowJumpButtons,
  setShowVolumeSlider,
  setAutoplayEnabled,
  setResumeLongTracksEnabled,
} from '@/utils/redux/slices/settingsSlice';

const PlayerSettings: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const preferredCodec = useSelector(selectPreferredCodec);
  const activeServer = useSelector(selectActiveServer);
  const showSleepTimer = useSelector(selectShowSleepTimer);
  const showPlaybackSpeed = useSelector(selectShowPlaybackSpeed);
  const showJumpButtons = useSelector(selectShowJumpButtons);
  const showVolumeSlider = useSelector(selectShowVolumeSlider);
  const autoplayEnabled = useSelector(selectAutoplayEnabled);
  const resumeLongTracks = useSelector(selectResumeLongTracksEnabled);
  const isAudiomuseConfigured = useSelector(selectIsAudiomuseConfigured);
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
              TrackPlayer.clearCache();
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

      <SettingsCardHeader subtle title={t('settings.player.cacheTitle')} />
      <SettingsCard>
        <SettingsRow
          label={t('settings.player.clearCache')}
          onPress={clearStreamCache}
        />
      </SettingsCard>
    </SettingsScreen>
  );
};

export default PlayerSettings;
