import React from 'react';
import { StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useExternalAlbum } from '@/hooks/albums';
import { useTheme } from '@/hooks/useTheme';
import NotFoundView from '@/components/NotFoundView';
import ExternalAlbumContent from './components/Content';
import LoadingExternalAlbumContent from './components/Content/Loading';

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

  if (error) {
    return <NotFoundView message="Couldn't load album. Check your connection." />;
  }

  if (!externalAlbum) {
    return <NotFoundView message="Album not found" />;
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
});