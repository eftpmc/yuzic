import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Appearance,
  Platform,
} from 'react-native';

import Header from '../components/Header';
import CurrentlyPlaying from './components/CurrentlyPlaying';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';

const PlayerSettings: React.FC = () => {
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
      <Header title={t('settings.player.title')} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <CurrentlyPlaying />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PlayerSettings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
});