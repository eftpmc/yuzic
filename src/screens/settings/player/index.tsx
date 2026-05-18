import React from 'react';
import { useTranslation } from 'react-i18next';
import SettingsScreen from '../components/SettingsScreen';
import CurrentlyPlaying from './components/CurrentlyPlaying';

const PlayerSettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <SettingsScreen title={t('settings.player.title')}>
      <CurrentlyPlaying />
    </SettingsScreen>
  );
};

export default PlayerSettings;
