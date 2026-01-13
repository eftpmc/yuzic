import { useMemo } from 'react';
import { Appearance } from 'react-native';
import { useSelector } from 'react-redux';
import {
  selectThemeMode,
  selectThemeColor,
} from '@/utils/redux/selectors/settingsSelectors';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const useTheme = () => {
  const mode = useSelector(selectThemeMode) as ThemeMode;
  const themeColor = useSelector(selectThemeColor);

  const systemScheme = Appearance.getColorScheme() as ResolvedTheme | null;

  const resolved: ResolvedTheme =
    mode === 'system' ? systemScheme ?? 'light' : mode;

  const isDarkMode = resolved === 'dark';

  const colors = useMemo(
    () => ({
      themeColor,
      background: isDarkMode ? '#000' : '#F2F2F7',
      card: isDarkMode ? '#111' : '#fff',
      text: isDarkMode ? '#f2f2f2' : '#000',
      subtext: isDarkMode ? '#aaa' : '#555',
      border: isDarkMode ? '#444' : '#ccc',
      muted: isDarkMode ? '#222' : '#eee',
    }),
    [isDarkMode, themeColor]
  );

  return {
    mode,
    resolved,
    isDarkMode,
    colors,
  };
};