import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useExternalAlbum } from '@/hooks/albums';
import ExternalAlbumContent from './components/Content';
import LoadingExternalAlbumContent from './components/Content/Loading';
import { useTheme } from '@/hooks/useTheme';

type RouteParams = {
  albumId: string;
};

const ExternalAlbumScreen: React.FC = () => {
  const route = useRoute<any>();
  const { albumId } = route.params as RouteParams;

  const { isDarkMode } = useTheme();

  const {
    album: externalAlbum,
    isLoading,
    error,
  } = useExternalAlbum(albumId);

  if (isLoading) {
    return (
      <SafeAreaView
        edges={['top']}
        style={styles.screen(isDarkMode)}
      >
        <LoadingExternalAlbumContent />
      </SafeAreaView>
    );
  }

  if (!externalAlbum || error) {
    return (
      <SafeAreaView style={styles.screen(isDarkMode)}>
        <Text style={styles.error(isDarkMode)}>
          {error?.message ?? 'Album not found'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top']}
      style={styles.screen(isDarkMode)}
    >
      <ExternalAlbumContent album={externalAlbum} />
    </SafeAreaView>
  );
};

export default ExternalAlbumScreen;

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