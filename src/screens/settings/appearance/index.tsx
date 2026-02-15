import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Appearance,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import { ThemeColor } from './components/ThemeColor';

import { ThemeModeSelector } from './components/ThemeModeSelector';
import { useTheme } from '@/hooks/useTheme';
import { PlayingBarActionSelector } from './components/PlayingBarActionSelector';
import { LanguageSelector } from './components/LanguageSelector';

const AppearanceSettings: React.FC = () => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();

  return (
    <SafeAreaView
      style={[
        styles.container,
        isDarkMode && styles.containerDark,
        Platform.OS === 'android' && { paddingTop: 24 },
      ]}
    >
      <Header title={t('settings.appearance.title')} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LanguageSelector />
        <ThemeModeSelector />
        <ThemeColor />
        <PlayingBarActionSelector />
      </ScrollView>
    </SafeAreaView>
  );
};

export default AppearanceSettings;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  containerDark: { backgroundColor: '#000' },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
});