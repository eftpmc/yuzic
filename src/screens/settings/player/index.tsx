import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import SettingsScreen from '../components/SettingsScreen';
import SettingsToggleGroup from '../components/SettingsToggleGroup';
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

  return (
    <SettingsScreen title={t('settings.player.title')}>
      <StreamingQuality />
      {supportsOpus && <SettingsToggleGroup items={opusItems} />}
      <SettingsToggleGroup items={playerControlItems} />
      <SettingsToggleGroup items={autoplayItems} />
    </SettingsScreen>
  );
};

export default PlayerSettings;
