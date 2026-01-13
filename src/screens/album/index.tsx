import React from 'react';
import {
  Text,
  StyleSheet,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAlbum } from '@/hooks/albums';

import AlbumContent from './components/Content';
import LoadingAlbumContent from './components/Content/Loading';
import { useTheme } from '@/hooks/useTheme';

const AlbumScreen: React.FC = () => {
  const route = useRoute<any>();
  const { id } = route.params;

  const { isDarkMode } = useTheme();

  const { album, isLoading, error } = useAlbum(id);

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.screen(isDarkMode)}>
        <LoadingAlbumContent />
      </SafeAreaView>
    );
  }

  if (!album || error) {
    return (
      <SafeAreaView style={styles.screen(isDarkMode)}>
        <Text style={styles.error(isDarkMode)}>
          {error?.message ?? 'Album not found'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen(isDarkMode)}>
      <AlbumContent album={album} />
    </SafeAreaView>
  );
};

export default AlbumScreen;

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