import React from 'react';
import { Sun, Moon, Smartphone } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { selectThemeMode } from '@/utils/redux/selectors/settingsSelectors';
import { setThemeMode, ThemeMode } from '@/utils/redux/slices/settingsSlice';
import SettingsIconSelectCard from '../../components/SettingsIconSelectCard';

const OPTIONS: { id: ThemeMode; icon: React.ReactElement<{ color?: string }> }[] = [
  { id: 'light', icon: <Sun size={18} /> },
  { id: 'dark', icon: <Moon size={18} /> },
  { id: 'system', icon: <Smartphone size={18} /> },
];

export const ThemeModeSelector: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const themeMode = useSelector(selectThemeMode) as ThemeMode;

  return (
    <SettingsIconSelectCard
      title={t('settings.appearance.theme.title')}
      items={OPTIONS.map(o => ({
        id: o.id,
        icon: o.icon,
      }))}
      selected={themeMode}
      onSelect={id => dispatch(setThemeMode(id as ThemeMode))}
    />
  );
};
