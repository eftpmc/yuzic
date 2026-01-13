import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePlaylist } from '@/hooks/playlists';

import PlaylistContent from './components/Content';
import LoadingPlaylistContent from './components/Content/Loading';
import { track } from '@/utils/analytics/amplitude';
import { useTheme } from '@/hooks/useTheme';

const PlaylistScreen: React.FC = () => {
  const route = useRoute<any>();
  const { id } = route.params;

  const { isDarkMode } = useTheme();
  const { playlist, isLoading } = usePlaylist(id);

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.screen(isDarkMode)}>
        <LoadingPlaylistContent />
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

  track("playlist screen", { title: playlist.title });

  return (
    <SafeAreaView edges={['top']} style={styles.screen(isDarkMode)}>
      <PlaylistContent playlist={playlist} />
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