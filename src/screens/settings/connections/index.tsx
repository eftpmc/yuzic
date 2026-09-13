import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';

import SettingsScreen from '../components/SettingsScreen';
import SettingsCard from '../components/SettingsCard';
import SettingsCardHeader from '../components/SettingsCardHeader';
import SettingsDivider from '../components/SettingsDivider';
import SettingsConnectionRow from '../components/SettingsConnectionRow';
import { selectListenBrainzAuthenticated } from '@/utils/redux/selectors/listenbrainzSelectors';
import {
  selectAudiomuseAuthenticated,
  selectAudiomuseEnabled,
} from '@/utils/redux/selectors/audiomuseSelectors';
import { useDownloaderStates } from '@/features/downloaders/registry';

/**
 * A registry for managed integrations. Feature-source opt-ins live only in
 * their feature settings; account and self-hosted-service setup lives here.
 */
const ConnectionsView: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const isLbConnected = useSelector(selectListenBrainzAuthenticated);
  const isAudiomuseEnabled = useSelector(selectAudiomuseEnabled);
  const isAudiomuseAuthenticated = useSelector(selectAudiomuseAuthenticated);
  const downloaders = useDownloaderStates();

  return (
    <SettingsScreen title={t('settings.sections.connections')}>

      <SettingsCardHeader title={t('settings.connections.accounts')} subtle />
      <SettingsCard>
        <SettingsConnectionRow
          label="ListenBrainz"
          summary={t('settings.connections.summary.listenbrainz')}
          status={isLbConnected ? 'connected' : 'disconnected'}
          statusLabel={t(isLbConnected ? 'settings.connections.status.connected' : 'settings.connections.status.notConnected')}
          onPress={() => router.push('/settings/listenbrainzView')}
        />
      </SettingsCard>

      <SettingsCardHeader title={t('settings.connections.services')} subtle />
      <SettingsCard>
        <SettingsConnectionRow
          label="AudioMuse-AI"
          summary={t('settings.connections.summary.audiomuse')}
          status={isAudiomuseAuthenticated && isAudiomuseEnabled ? 'connected' : 'disconnected'}
          statusLabel={t(isAudiomuseAuthenticated && isAudiomuseEnabled ? 'settings.connections.status.ready' : 'settings.connections.status.notSetUp')}
          onPress={() => router.push('/settings/audiomuseView')}
        />
      </SettingsCard>

      <SettingsCardHeader title={t('settings.downloaders.title')} subtle />
      <SettingsCard>
        {downloaders.map(({ def, isConnected }, index) => (
          <React.Fragment key={def.id}>
            {index > 0 && <SettingsDivider />}
            <SettingsConnectionRow
              label={t(`settings.downloaders.${def.id}.title`)}
              summary={t('settings.connections.summary.downloader')}
              status={isConnected ? 'connected' : 'disconnected'}
              statusLabel={t(isConnected ? 'settings.connections.status.ready' : 'settings.connections.status.notSetUp')}
              onPress={() => router.push(def.settingsRoute)}
            />
          </React.Fragment>
        ))}
      </SettingsCard>
    </SettingsScreen>
  );
};

export default ConnectionsView;
