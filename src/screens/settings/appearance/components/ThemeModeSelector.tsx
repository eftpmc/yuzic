import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { selectThemeMode } from '@/utils/redux/selectors/settingsSelectors';
import { setThemeMode, ThemeMode } from '@/utils/redux/slices/settingsSlice';
import SettingsButtonSelect from '../../components/SettingsButtonSelect';

const OPTIONS: { id: ThemeMode; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'light', icon: 'sunny' },
  { id: 'dark', icon: 'moon' },
  { id: 'system', icon: 'phone-portrait' },
];

export const ThemeModeSelector: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const themeMode = useSelector(selectThemeMode) as ThemeMode;

  return (
    <SettingsButtonSelect
      title={t('settings.appearance.theme.title')}
      items={OPTIONS.map(o => ({
        id: o.id,
        icon: <Ionicons name={o.icon} size={18} />,
      }))}
      selected={themeMode}
      onSelect={id => dispatch(setThemeMode(id as ThemeMode))}
    />
  );
};
