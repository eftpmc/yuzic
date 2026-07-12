import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import SettingsScreen from '../components/SettingsScreen';
import SettingsCard from '../components/SettingsCard';
import SettingsDivider from '../components/SettingsDivider';
import SettingsRow from '../components/SettingsRow';
import { useDownloaderStates } from '@/features/downloaders/registry';

const DownloadersView: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const downloaders = useDownloaderStates();

  return (
    <SettingsScreen title={t('settings.downloaders.title')}>
      <SettingsCard>
        {downloaders.map(({ def, isConnected }, index) => (
          <React.Fragment key={def.id}>
            {index > 0 && <SettingsDivider />}
            <SettingsRow
              label={t(`settings.downloaders.${def.id}.title`)}
              status={isConnected ? 'connected' : 'disconnected'}
              onPress={() => router.push(def.settingsRoute)}
            />
          </React.Fragment>
        ))}
      </SettingsCard>
    </SettingsScreen>
  );
};

export default DownloadersView;
