import React from 'react';
import { useTranslation } from 'react-i18next';
import SettingsScreen from '../components/SettingsScreen';
import Stats from './components/Stats';
import AudioQuality from './components/AudioQuality';
import Downloads from './components/Downloads';
import LibrarySelect from './components/LibrarySelect';
import PendingOfflineChanges from './components/PendingOfflineChanges';

const LibrarySettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <SettingsScreen title={t('settings.library.title')}>
      <PendingOfflineChanges />
      <Stats />
      <Downloads />
      <LibrarySelect />
      <AudioQuality />
    </SettingsScreen>
  );
};

export default LibrarySettings;
