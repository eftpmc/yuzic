import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import SettingsScreen from '../components/SettingsScreen';
import SettingsCard from '../components/SettingsCard';
import SettingsDivider from '../components/SettingsDivider';
import SettingsRow from '../components/SettingsRow';
import {
  selectLidarrAuthenticated,
  selectSlskdAuthenticated,
} from '@/utils/redux/selectors/downloadersSelectors';

const DownloadersView: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const isLidarrConnected = useSelector(selectLidarrAuthenticated);
  const isSlskdConnected = useSelector(selectSlskdAuthenticated);

  return (
    <SettingsScreen title={t('settings.downloaders.title')}>
      <SettingsCard>
        <SettingsRow
          label={t('settings.downloaders.lidarr.title')}
          status={isLidarrConnected ? 'connected' : 'disconnected'}
          onPress={() => router.push('/settings/lidarrView')}
        />
        <SettingsDivider />
        <SettingsRow
          label={t('settings.downloaders.slskd.title')}
          status={isSlskdConnected ? 'connected' : 'disconnected'}
          onPress={() => router.push('/settings/slskdView')}
        />
      </SettingsCard>
    </SettingsScreen>
  );
};

export default DownloadersView;
