import React from 'react';
import { Text, StyleSheet, useColorScheme } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePlaylist } from '@/hooks/playlists';

import List from './components/List';
import LList from './components/loading/List';

const PlaylistScreen: React.FC = () => {
  const route = useRoute<any>();
  const { id } = route.params;

  const isDarkMode = useColorScheme() === 'dark';
  const { playlist, isLoading } = usePlaylist(id);

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.screen(isDarkMode)}>
        <LList />
      </SafeAreaView>
    );
  }

  if (!playlist) {
    return (
      <SafeAreaView style={styles.screen(isDarkMode)}>
        <Text style={styles.error(isDarkMode)}>Playlist not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen(isDarkMode)}>
      <List playlist={playlist} />
    </SafeAreaView>
  );
};

export default PlaylistScreen;

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