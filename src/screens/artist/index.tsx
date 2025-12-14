import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  useColorScheme,
  StyleSheet,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArtistData } from '@/types';
import { useApi } from '@/api';

import List from './components/List';
import LList from './components/loading/List';

const ArtistScreen: React.FC = () => {
  const route = useRoute<any>();
  const { id } = route.params;

  const api = useApi();
  const isDarkMode = useColorScheme() === 'dark';

  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadArtist = async () => {
      try {
        setIsLoading(true);
        const result = await api.artists.get(id);
        if (mounted) setArtist(result);
      } catch {
        if (mounted) setArtist(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadArtist();

    return () => {
      mounted = false;
    };
  }, [id]);

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