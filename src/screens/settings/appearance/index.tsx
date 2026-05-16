import React from 'react';
import { useTranslation } from 'react-i18next';
import SettingsScreen from '../components/SettingsScreen';
import { ThemeColor } from './components/ThemeColor';
import { ThemeModeSelector } from './components/ThemeModeSelector';
import { PlayingBarActionSelector } from './components/PlayingBarActionSelector';
import { LanguageSelector } from './components/LanguageSelector';

const AppearanceSettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <SettingsScreen title={t('settings.appearance.title')}>
      <LanguageSelector />
      <ThemeModeSelector />
      <ThemeColor />
      <PlayingBarActionSelector />
    </SettingsScreen>
  );
};

export default AppearanceSettings;
