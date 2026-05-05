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
  source?: 'deezer' | 'musicbrainz' | 'lastfm';
};

const ExternalAlbumScreen: React.FC = () => {
  const route = useRoute<any>();
  const { albumId, source } = route.params as RouteParams;

  const { isDarkMode } = useTheme();

  const {
    album: externalAlbum,
    isLoading,
    error,
  } = useExternalAlbum({ albumId, source });

  if (isLoading) {
    return (
      <SafeAreaView
        edges={['top']}
        style={[styles.screen, isDarkMode && styles.screenDark]}
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
      style={[styles.screen, isDarkMode && styles.screenDark]}
    >
      <ExternalAlbumContent album={externalAlbum} />
    </SafeAreaView>
  );
};

export default ExternalAlbumScreen;

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
