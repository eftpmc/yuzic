import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
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

  const systemScheme = useColorScheme() as ResolvedTheme | null;

  const resolved: ResolvedTheme =
    mode === 'system' ? systemScheme ?? 'light' : mode;

  const isDarkMode = resolved === 'dark';

  const colors = useMemo(
    () => ({
      themeColor,
      background: isDarkMode ? '#000' : '#F2F2F7',
      card: isDarkMode ? '#222' : '#fff',
      text: isDarkMode ? '#f2f2f2' : '#000',
      secondary: isDarkMode ? '#dcdcdc' : '#111',
      subtext: isDarkMode ? '#aaa' : '#555',
      border: isDarkMode ? '#444' : '#ccc',
      muted: isDarkMode ? '#333' : '#eee',
      placeholder: isDarkMode ? '#666' : '#999',
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
