import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';

import SettingsScreen from '../components/SettingsScreen';
import SettingsCard from '../components/SettingsCard';
import SettingsDivider from '../components/SettingsDivider';
import SettingsRow from '../components/SettingsRow';
import { selectListenBrainzAuthenticated } from '@/utils/redux/selectors/listenbrainzSelectors';
import {
  selectAnyDeezerEnabled,
  selectMusicbrainzExternalEnabled,
  selectLastfmEnabled,
  selectListenbrainzDiscoveryEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import { selectAudiomuseEnabled } from '@/utils/redux/selectors/audiomuseSelectors';

const IntegrationsView: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const isLbConnected = useSelector(selectListenBrainzAuthenticated);
  const isDeezerEnabled = useSelector(selectAnyDeezerEnabled);
  const isMusicbrainzEnabled = useSelector(selectMusicbrainzExternalEnabled);
  const isLastfmEnabled = useSelector(selectLastfmEnabled);
  const isLbDiscoveryEnabled = useSelector(selectListenbrainzDiscoveryEnabled);
  const isAudiomuseEnabled = useSelector(selectAudiomuseEnabled);

  return (
    <SettingsScreen title={t('settings.sections.integrations')}>
      <SettingsCard>
        <SettingsRow
          label="Deezer"
          status={isDeezerEnabled ? 'enabled' : 'disabled'}
          onPress={() => router.push('/settings/deezerView')}
        />
        <SettingsDivider />
        <SettingsRow
          label="MusicBrainz"
          status={isMusicbrainzEnabled ? 'enabled' : 'disabled'}
          onPress={() => router.push('/settings/musicbrainzView')}
        />
        <SettingsDivider />
        <SettingsRow
          label="Last.fm"
          status={isLastfmEnabled ? 'enabled' : 'disabled'}
          onPress={() => router.push('/settings/lastfmView')}
        />
        <SettingsDivider />
        <SettingsRow
          label="ListenBrainz"
          // Two independent things live behind this row — an account for
          // scrobbling, and a switch for the public discovery graph — so it
          // reads as on when either of them is.
          status={isLbConnected ? 'connected' : isLbDiscoveryEnabled ? 'enabled' : 'disconnected'}
          onPress={() => router.push('/settings/listenbrainzView')}
        />
        <SettingsDivider />
        <SettingsRow
          label="AudioMuse-AI"
          status={isAudiomuseEnabled ? 'enabled' : 'disabled'}
          onPress={() => router.push('/settings/audiomuseView')}
        />
      </SettingsCard>
    </SettingsScreen>
  );
};

export default IntegrationsView;
