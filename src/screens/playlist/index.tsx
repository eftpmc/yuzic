import React from 'react';
import { StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePlaylist } from '@/hooks/playlists';
import { useTheme } from '@/hooks/useTheme';
import NotFoundView from '@/components/NotFoundView';

import PlaylistContent from './components/Content';
import LoadingPlaylistContent from './components/Content/Loading';

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
    return <NotFoundView message="Playlist not found" />;
  }

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
});