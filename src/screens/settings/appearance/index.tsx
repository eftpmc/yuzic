import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Appearance,
  Platform,
} from 'react-native';
import Header from '../components/Header';
import { ThemeColor } from './components/ThemeColor';
import { Columns } from './components/Columns';
import { AppearanceToggles } from './components/Toggles';
import { ThemeModeSelector } from './components/ThemeModeSelector';
import { useTheme } from '@/hooks/useTheme';

const AppearanceSettings: React.FC = () => {
  const { isDarkMode } = useTheme();

  return (
    <SafeAreaView
      style={[
        styles.container,
        isDarkMode && styles.containerDark,
        Platform.OS === 'android' && { paddingTop: 24 },
      ]}
    >
      <Header title="Appearance" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemeModeSelector />
        <ThemeColor />
        <Columns />
        <AppearanceToggles/>
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