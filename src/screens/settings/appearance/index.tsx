import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import SettingsScreen from '../components/SettingsScreen';
import SettingsCardHeader from '../components/SettingsCardHeader';
import SettingsToggleGroup from '../components/SettingsToggleGroup';
import { ThemeColor } from './components/ThemeColor';
import { ThemeModeSelector } from './components/ThemeModeSelector';
import { PlayingBarActionSelector } from './components/PlayingBarActionSelector';
import { LanguageSelector } from './components/LanguageSelector';
import { selectShowQualityBadge, selectShowSourceHeaders } from '@/utils/redux/selectors/settingsSelectors';
import { setShowQualityBadge, setShowSourceHeaders } from '@/utils/redux/slices/settingsSlice';

const AppearanceSettings: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const showQualityBadge = useSelector(selectShowQualityBadge);
  const showSourceHeaders = useSelector(selectShowSourceHeaders);

  const toggleQualityBadge = useCallback((v: boolean) => { dispatch(setShowQualityBadge(v)); }, [dispatch]);
  const toggleSourceHeaders = useCallback((v: boolean) => { dispatch(setShowSourceHeaders(v)); }, [dispatch]);

  const qualityBadgeItems = useMemo(() => [{
    label: t('settings.appearance.showQualityBadge'),
    subtext: t('settings.appearance.showQualityBadgeSubtext'),
    value: showQualityBadge,
    onValueChange: toggleQualityBadge,
  }], [t, showQualityBadge, toggleQualityBadge]);

  const sourceHeaderItems = useMemo(() => [{
    label: t('settings.appearance.showSourceHeaders'),
    subtext: t('settings.appearance.showSourceHeadersSubtext'),
    value: showSourceHeaders,
    onValueChange: toggleSourceHeaders,
  }], [t, showSourceHeaders, toggleSourceHeaders]);

  return (
    <SettingsScreen title={t('settings.appearance.title')}>
      <LanguageSelector />
      <ThemeModeSelector />
      <ThemeColor />
      <SettingsCardHeader subtle title={t('settings.appearance.playing')} />
      <SettingsToggleGroup items={qualityBadgeItems} />
      <PlayingBarActionSelector />
      <SettingsCardHeader subtle title={t('settings.appearance.display')} />
      <SettingsToggleGroup items={sourceHeaderItems} />
    </SettingsScreen>
  );
};

export default AppearanceSettings;
