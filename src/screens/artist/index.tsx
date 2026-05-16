import React from 'react';
import { StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useArtist } from '@/hooks/artists';
import { useTheme } from '@/hooks/useTheme';
import NotFoundView from '@/components/NotFoundView';

import ArtistContent from './components/Content';
import LoadingArtistContent from './components/Content/Loading';

const ArtistScreen: React.FC = () => {
  const route = useRoute<any>();
  const { id } = route.params;

  const { colors } = useTheme();
  const { artist, isLoading } = useArtist(id);

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
        <LoadingArtistContent />
      </SafeAreaView>
    );
  }

  if (!artist) {
    return <NotFoundView message="Artist not found" />;
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <ArtistContent artist={artist} />
    </SafeAreaView>
  );
};

export default ArtistScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});