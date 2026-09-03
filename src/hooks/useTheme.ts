import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';
import {
  selectThemeMode,
  selectThemeColor,
} from '@/utils/redux/selectors/settingsSelectors';
import { statusColor, type SemanticThemeColors } from '@/constants/design';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const useTheme = () => {
  const mode = useSelector(selectThemeMode) as ThemeMode;
  const themeColor = useSelector(selectThemeColor);

  const systemScheme = useColorScheme() as ResolvedTheme | null;

  const resolved: ResolvedTheme =
    mode === 'system' ? systemScheme ?? 'light' : mode;

  const isDarkMode = resolved === 'dark';

  const colors = useMemo<SemanticThemeColors>(
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
      overlay: isDarkMode ? 'rgba(0,0,0,0.82)' : 'rgba(242,242,247,0.92)',
      statusSurface: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
      onThemeColor: '#fff',
      success: '#34C759',
      warning: '#FF9500',
      error: isDarkMode ? '#FF453A' : '#FF3B30',
      destructive: isDarkMode ? '#FF453A' : '#FF3B30',
      // Soft red info-card tint, dark-mode aware.
      destructiveSurface: isDarkMode ? 'rgba(255,69,58,0.12)' : '#fff1f0',
      destructiveBorder: isDarkMode ? 'rgba(255,69,58,0.35)' : '#ead4d2',
      destructiveOnSurface: isDarkMode ? '#ffb4ad' : '#c7342f',
      warningText: statusColor.warningText,
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
