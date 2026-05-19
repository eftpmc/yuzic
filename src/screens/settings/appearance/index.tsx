import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import SettingsScreen from '../components/SettingsScreen';
import SettingsToggleGroup from '../components/SettingsToggleGroup';
import { ThemeColor } from './components/ThemeColor';
import { ThemeModeSelector } from './components/ThemeModeSelector';
import { PlayingBarActionSelector } from './components/PlayingBarActionSelector';
import { LanguageSelector } from './components/LanguageSelector';
import { selectShowQualityBadge } from '@/utils/redux/selectors/settingsSelectors';
import { setShowQualityBadge } from '@/utils/redux/slices/settingsSlice';

const AppearanceSettings: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const showQualityBadge = useSelector(selectShowQualityBadge);

  return (
    <SettingsScreen title={t('settings.appearance.title')}>
      <LanguageSelector />
      <ThemeModeSelector />
      <ThemeColor />
      <PlayingBarActionSelector />
      <SettingsToggleGroup
        items={[
          {
            label: t('settings.appearance.showQualityBadge'),
            subtext: t('settings.appearance.showQualityBadgeSubtext'),
            value: showQualityBadge,
            onValueChange: v => dispatch(setShowQualityBadge(v)),
          },
        ]}
      />
    </SettingsScreen>
  );
};

export default AppearanceSettings;
