import React from 'react';
import { useTranslation } from 'react-i18next';
import SettingsScreen from '../components/SettingsScreen';
import Stats from './components/Stats';
import Downloads from './components/Downloads';
import DownloadQuality from './components/DownloadQuality';
import LibrarySelect from './components/LibrarySelect';
import PendingOfflineChanges from './components/PendingOfflineChanges';

const LibrarySettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <SettingsScreen title={t('settings.library.title')}>
      <PendingOfflineChanges />
      <Stats />
      <Downloads />
      <DownloadQuality />
      <LibrarySelect />
    </SettingsScreen>
  );
};

export default LibrarySettings;
