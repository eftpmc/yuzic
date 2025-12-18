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
import Prompt from './components/Prompt';
import Tweaks from './components/Tweaks';

const PlayerSettings: React.FC = () => {
  const isDarkMode = Appearance.getColorScheme() === 'dark';

  return (
    <SafeAreaView
      style={[
        styles.container,
        isDarkMode && styles.containerDark,
        Platform.OS === 'android' && { paddingTop: 24 },
      ]}
    >
      <Header title="Player" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <CurrentlyPlaying />
        <Prompt />
        <Tweaks />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PlayerSettings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
});