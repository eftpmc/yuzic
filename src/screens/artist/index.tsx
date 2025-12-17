import React from 'react';
import {
  View,
  Text,
  useColorScheme,
  StyleSheet,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useArtist } from '@/hooks/artists';

import List from './components/List';
import LList from './components/loading/List';

const ArtistScreen: React.FC = () => {
  const route = useRoute<any>();
  const { id } = route.params;

  const isDarkMode = useColorScheme() === 'dark';
  const { artist, isLoading } = useArtist(id);

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.screen(isDarkMode)}>
        <LList />
      </SafeAreaView>
    );
  }

  if (!artist) {
    return (
      <SafeAreaView style={styles.screen(isDarkMode)}>
        <Text style={styles.error(isDarkMode)}>Artist not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen(isDarkMode)}>
      <List artist={artist} />
    </SafeAreaView>
  );
};

export default ArtistScreen;

const styles = StyleSheet.create({
  screen: (isDark: boolean) => ({
    flex: 1,
    backgroundColor: isDark ? '#000' : '#fff',
  }),
  error: (isDark: boolean) => ({
    color: isDark ? '#fff' : '#000',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  }),
});