import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloudOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useAlbum, useExternalAlbum } from '@/hooks/albums';
import { useLibrary } from '@/contexts/LibraryContext';
import { matchAlbumToLibrary } from '@/hooks/libraryMatch';
import { useTheme } from '@/hooks/useTheme';
import NotFoundView from '@/components/NotFoundView';
import StatusBanner from '@/components/StatusBanner';

import AlbumContent from './components/Content';
import LoadingAlbumContent from './components/Content/Loading';

type RouteParams = {
  id?: string;
  source?: string;
  albumId?: string;
  artist?: string;
  title?: string;
  forceExternal?: string;
};

const AlbumScreen: React.FC = () => {
  const route = useRoute<any>();
  const { id, source, albumId, artist, title, forceExternal } = (route.params ?? {}) as RouteParams;

  const { t } = useTranslation();
  const { colors } = useTheme();
  const { albums } = useLibrary();

  // Identity is re-resolved only when the route's own identity params change
  // (a genuine navigation to a different album, including React Navigation
  // reusing this screen instance instead of pushing a new one) — but not
  // when `albums` changes on its own, e.g. a library sync completing in the
  // background must not flip an already-rendered external-only view into
  // local mode underneath the user.
  const resolvedLocalId = useMemo(() => {
    if (id) return id;
    if (forceExternal === 'true') return null;
    if (!artist || !title) return null;
    const match = matchAlbumToLibrary(
      { id: albumId ?? title, title, artist, cover: { kind: 'none' }, subtext: '' },
      albums
    );
    return match?.id ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, forceExternal, artist, title, albumId]);

  const localResult = useAlbum(resolvedLocalId ?? '');
  const externalResult = useExternalAlbum(
    resolvedLocalId ? {} : { albumId, source, artist, title }
  );

  if (resolvedLocalId) {
    if (localResult.isLoading) {
      return (
        <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
          <LoadingAlbumContent />
        </SafeAreaView>
      );
    }
    if (!localResult.album) {
      return <NotFoundView message="Album not found" />;
    }
    return (
      <SafeAreaView testID="album-screen" edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
        {localResult.degraded && (
          <StatusBanner
            icon={<CloudOff size={14} color={colors.subtext} />}
            text={t('common.serverUnreachableBanner')}
            closable
            style={styles.degradedBanner}
            testID="server-unreachable-banner"
          />
        )}
        <AlbumContent localAlbum={localResult.album} externalAlbum={null} songsLoading={localResult.songsLoading} />
      </SafeAreaView>
    );
  }

  if (!albumId && !(artist && title)) {
    return <NotFoundView message="Album not found" />;
  }
  if (externalResult.isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
        <LoadingAlbumContent />
      </SafeAreaView>
    );
  }
  if (externalResult.error || !externalResult.album) {
    return <NotFoundView message="Couldn't load album. Check your connection." />;
  }

  return (
    <SafeAreaView testID="album-screen" edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <AlbumContent localAlbum={null} externalAlbum={externalResult.album} />
    </SafeAreaView>
  );
};

export default AlbumScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  degradedBanner: {
    marginHorizontal: 16,
    marginTop: 8,
  },
});
