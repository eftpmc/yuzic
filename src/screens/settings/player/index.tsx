import React from 'react';
import { useTranslation } from 'react-i18next';
import SettingsScreen from '../components/SettingsScreen';
import CurrentlyPlaying from './components/CurrentlyPlaying';
import Equalizer from './components/Equalizer';

const PlayerSettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <SettingsScreen title={t('settings.player.title')}>
      <CurrentlyPlaying />
      <Equalizer />
    </SettingsScreen>
  );
};

export default PlayerSettings;
