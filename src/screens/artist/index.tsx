import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useArtist, useArtists } from '@/hooks/artists';
import { useExternalArtist } from '@/hooks/artists/useExternalArtist';
import { matchArtistToLibrary } from '@/hooks/libraryMatch';
import { useTheme } from '@/hooks/useTheme';
import NotFoundView from '@/components/NotFoundView';

import ArtistContent from './components/Content';
import LoadingArtistContent from './components/Content/Loading';

type RouteParams = {
  id?: string;
  source?: string;
  artistId?: string;
  mbid?: string;
  name?: string;
  forceExternal?: string;
};

const ArtistScreen: React.FC = () => {
  const route = useRoute<any>();
  const { id, source, artistId, mbid, name, forceExternal } = (route.params ?? {}) as RouteParams;

  const { colors } = useTheme();
  const { artists } = useArtists();

  // Identity is resolved once, at mount, and frozen — a library-match
  // resolving true mid-session (e.g. library sync still in flight when this
  // screen mounted) must not flip an already-rendered external-only view
  // into local mode underneath the user.
  const resolvedLocalId = useMemo(() => {
    if (id) return id;
    if (forceExternal === 'true') return null;
    if (!name) return null;
    const match = matchArtistToLibrary(
      { id: artistId ?? mbid ?? name, name, cover: { kind: 'none' }, subtext: '', externalIds: { mbid } },
      artists
    );
    return match?.id ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const localResult = useArtist(resolvedLocalId ?? '');
  const externalResult = useExternalArtist(
    resolvedLocalId ? null : (artistId || mbid || name ? { source, artistId, mbid, name } : null)
  );

  if (resolvedLocalId) {
    if (localResult.isLoading) {
      return (
        <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
          <LoadingArtistContent />
        </SafeAreaView>
      );
    }
    if (!localResult.artist) {
      return <NotFoundView message="Artist not found" />;
    }
    return (
      <SafeAreaView testID="artist-screen" edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
        <ArtistContent localArtist={localResult.artist} externalArtist={null} />
      </SafeAreaView>
    );
  }

  if (!artistId && !mbid && !name) {
    return <NotFoundView message="Artist not found" />;
  }
  if (externalResult.isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
        <LoadingArtistContent />
      </SafeAreaView>
    );
  }
  if (externalResult.error || !externalResult.data) {
    return <NotFoundView message="Couldn't load artist. Check your connection." />;
  }

  return (
    <SafeAreaView testID="artist-screen" edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <ArtistContent localArtist={null} externalArtist={externalResult.data} />
    </SafeAreaView>
  );
};

export default ArtistScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
