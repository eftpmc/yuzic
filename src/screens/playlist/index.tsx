import React from 'react';
import { StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloudOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { usePlaylist } from '@/hooks/playlists';
import { useTheme } from '@/hooks/useTheme';
import NotFoundView from '@/components/NotFoundView';
import StatusBanner from '@/components/StatusBanner';

import PlaylistContent from './components/Content';
import LoadingPlaylistContent from './components/Content/Loading';

const PlaylistScreen: React.FC = () => {
  const route = useRoute<any>();
  const { id } = route.params;

  const { t } = useTranslation();
  const { colors } = useTheme();
  const { playlist, isLoading, songsLoading, degraded, error } = usePlaylist(id);

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
        <LoadingPlaylistContent />
      </SafeAreaView>
    );
  }

  if (!playlist) {
    return (
      <NotFoundView
        message={error ? "Couldn't load playlist. Check your connection." : 'Playlist not found'}
      />
    );
  }

  return (
    <SafeAreaView testID="playlist-screen" edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
      {degraded && (
        <StatusBanner
          icon={<CloudOff size={14} color={colors.subtext} />}
          text={t('common.serverUnreachableBanner')}
          closable
          style={styles.degradedBanner}
          testID="server-unreachable-banner"
        />
      )}
      <PlaylistContent playlist={playlist} songsLoading={songsLoading} />
    </SafeAreaView>
  );
};

export default PlaylistScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  degradedBanner: {
    marginHorizontal: 16,
    marginTop: 8,
  },
});
