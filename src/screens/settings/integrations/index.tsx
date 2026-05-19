import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';

import SettingsScreen from '../components/SettingsScreen';
import SettingsCard from '../components/SettingsCard';
import SettingsDivider from '../components/SettingsDivider';
import SettingsRow from '../components/SettingsRow';
import { selectListenBrainzAuthenticated } from '@/utils/redux/selectors/listenbrainzSelectors';
import { selectLastFmAuthenticated } from '@/utils/redux/selectors/lastfmSelectors';
import { selectAnyDeezerEnabled, selectMusicbrainzExternalEnabled } from '@/utils/redux/selectors/settingsSelectors';

const IntegrationsView: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const isLbConnected = useSelector(selectListenBrainzAuthenticated);
  const isLfmConnected = useSelector(selectLastFmAuthenticated);
  const isDeezerEnabled = useSelector(selectAnyDeezerEnabled);
  const isMusicbrainzEnabled = useSelector(selectMusicbrainzExternalEnabled);

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
          status={isLfmConnected ? 'connected' : 'disconnected'}
          onPress={() => router.push('/settings/lastfmView')}
        />
        <SettingsDivider />
        <SettingsRow
          label="ListenBrainz"
          status={isLbConnected ? 'connected' : 'disconnected'}
          onPress={() => router.push('/settings/listenbrainzView')}
        />
      </SettingsCard>
    </SettingsScreen>
  );
};

export default IntegrationsView;
