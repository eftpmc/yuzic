import React from 'react';
import { StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAlbum } from '@/hooks/albums';
import { useTheme } from '@/hooks/useTheme';
import NotFoundView from '@/components/NotFoundView';

import AlbumContent from './components/Content';
import LoadingAlbumContent from './components/Content/Loading';

const AlbumScreen: React.FC = () => {
  const route = useRoute<any>();
  const { id } = route.params;

  const { isDarkMode } = useTheme();

  const { album, isLoading, songsLoading, error } = useAlbum(id);

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, isDarkMode && styles.screenDark]}>
        <LoadingAlbumContent />
      </SafeAreaView>
    );
  }

  if (!album || error) {
    return <NotFoundView message="Album not found" />;
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, isDarkMode && styles.screenDark]}>
      <AlbumContent album={album} songsLoading={songsLoading} />
    </SafeAreaView>
  );
};

export default AlbumScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  screenDark: {
    backgroundColor: '#000',
  },
  screenLight: {
    backgroundColor: '#fff',
  },
});