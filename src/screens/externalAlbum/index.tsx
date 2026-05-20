import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useExternalAlbum } from '@/hooks/albums';
import { useTheme } from '@/hooks/useTheme';
import { useAlbumLibraryMatch } from '@/hooks/useLibraryMatch';
import NotFoundView from '@/components/NotFoundView';
import ExternalAlbumContent from './components/Content';
import LoadingExternalAlbumContent from './components/Content/Loading';

type RouteParams = {
  albumId: string;
  source?: 'deezer' | 'musicbrainz' | 'lastfm';
  artist?: string;
  title?: string;
};

const ExternalAlbumScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { albumId, source, artist, title } = route.params as RouteParams;
  const { colors } = useTheme();

  const localId = useAlbumLibraryMatch(
    artist && title ? { id: albumId, title, artist, cover: { kind: 'none' }, subtext: '' } : null
  );

  const { album: externalAlbum, isLoading, error } = useExternalAlbum({ albumId, source, artist, title });

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
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
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
      {localId && (
        <TouchableOpacity
          style={[styles.libraryBanner, { backgroundColor: colors.card }]}
          onPress={() => navigation.navigate('albumView', { id: localId })}
          activeOpacity={0.75}
        >
          <Text style={[styles.bannerText, { color: colors.secondary }]}>
            This album is in your library — tap to open
          </Text>
        </TouchableOpacity>
      )}
      <ExternalAlbumContent album={externalAlbum} />
    </SafeAreaView>
  );
};

export default ExternalAlbumScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  libraryBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
