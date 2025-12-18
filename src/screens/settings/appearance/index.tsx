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

const AppearanceSettings: React.FC = () => {
  const isDarkMode = Appearance.getColorScheme() === 'dark';

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
        <ThemeColor />
        <Columns />
      </ScrollView>
    </SafeAreaView>
  );
};

export default AppearanceSettings;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  containerDark: { backgroundColor: '#000' },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
});