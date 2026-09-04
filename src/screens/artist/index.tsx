import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloudOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useArtist, useArtists } from '@/hooks/artists';
import { useExternalArtist } from '@/hooks/artists/useExternalArtist';
import { matchArtistToLibrary } from '@/hooks/libraryMatch';
import { useTheme } from '@/hooks/useTheme';
import NotFoundView from '@/components/NotFoundView';
import StatusBanner from '@/components/StatusBanner';

import ArtistContent from './components/Content';
import LoadingArtistContent from './components/Content/Loading';
import { DETAIL_BAR_HEIGHT } from '@/components/DetailHeader'
import { spacing } from '@/constants/design';

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

  const { t } = useTranslation();
  const { colors } = useTheme();
  const { artists } = useArtists();
  const insets = useSafeAreaInsets();

  // Identity is re-resolved only when the route's own identity params change
  // (a genuine navigation to a different artist, including React Navigation
  // reusing this screen instance instead of pushing a new one) — but not when
  // `artists` changes on its own, e.g. a library sync completing in the
  // background must not flip an already-rendered external-only view into
  // local mode underneath the user.
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
  }, [id, forceExternal, name, artistId, mbid]);

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
      return (
        <NotFoundView
          message={localResult.error ? "Couldn't load artist. Check your connection." : 'Artist not found'}
        />
      );
    }
    return (
      <View testID="artist-screen" style={[styles.screen, { backgroundColor: colors.background }]}>
        {localResult.degraded && (
          <View
            pointerEvents="box-none"
            style={[styles.degradedBanner, { top: insets.top + DETAIL_BAR_HEIGHT }]}
          >
            <StatusBanner
              icon={<CloudOff size={14} color={colors.subtext} />}
              text={t('common.serverUnreachableBanner')}
              closable
              testID="server-unreachable-banner"
            />
          </View>
        )}
        <ArtistContent localArtist={localResult.artist} externalArtist={null} />
      </View>
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
    <View testID="artist-screen" style={[styles.screen, { backgroundColor: colors.background }]}>
      <ArtistContent localArtist={null} externalArtist={externalResult.data} />
    </View>
  );
};

export default ArtistScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  // Under the floating bar rather than above the content: the art runs to the
  // top of the screen now, and there is nowhere above it left to push.
  degradedBanner: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
  },
});
