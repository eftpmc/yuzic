import React, { forwardRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { ListEnd, Play, Shuffle, List, CheckCircle, ArrowDownCircle, Trash2 } from 'lucide-react-native';
import { toast } from '@backpackapp-io/react-native-toast';

import { Playlist, PlaylistBase } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import { usePlaying } from '@/contexts/PlayingContext';
import { useDownload } from '@/contexts/DownloadContext';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';
import { useDeletePlaylist } from '@/hooks/playlists';
import { FAVORITES_ID } from '@/constants/favorites';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { useLazyPlaylistDetail } from './useLazyCollectionDetails';

export type PlaylistOptionsProps = {
  playlist: PlaylistBase | Playlist | null;
  /** Hide "Go to Playlist" when already on the playlist screen */
  hideGoToPlaylist?: boolean;
};

function formatDate(value: string | Date): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  const year = d.getFullYear();
  const month = d.toLocaleString('default', { month: 'short' });
  const day = d.getDate();
  return `${month} ${day}, ${year}`;
}

const PlaylistOptions = forwardRef<
  BottomSheetModal,
  PlaylistOptionsProps
>(({ playlist, hideGoToPlaylist }, ref) => {
  const { t } = useTranslation();
  const { isDarkMode, colors } = useTheme();
  const navigation = useNavigation<any>();

  const {
    playSongInCollection,
    addCollectionToQueue,
    shuffleCollectionToQueue,
    getQueue,
  } = usePlaying();

  const { downloadPlaylistById, getCollectionDownloadState } =
    useDownload();

  const deletePlaylist = useDeletePlaylist();

  const snapPoints = useMemo(() => ['55%', '90%'], []);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { playlistWithSongs, songs, songsLoading } = useLazyPlaylistDetail(playlist, isSheetOpen);

  const sheetBg = { backgroundColor: isDarkMode ? colors.card : colors.background };

  const close = () => {
    (ref as any)?.current?.dismiss();
  };

  const songIds = useMemo(() => songs.map(s => s.id), [songs]);
  const { isDownloaded, isDownloading } = getCollectionDownloadState(songIds);
  const playbackDisabled = songsLoading || !songs.length;

  const handlePlay = (shuffle: boolean) => {
    if (!playlistWithSongs || playbackDisabled) return;
    playSongInCollection(songs[0], playlistWithSongs, shuffle);
    close();
  };

  const handleAddToQueue = () => {
    if (!playlistWithSongs || playbackDisabled) return;
    const hasQueue = getQueue().length > 0;
    if (!hasQueue) {
      playSongInCollection(songs[0], playlistWithSongs, false);
    } else {
      addCollectionToQueue(playlistWithSongs);
    }
    close();
  };

  const handleShuffleToQueue = () => {
    if (!playlistWithSongs || playbackDisabled) return;
    const hasQueue = getQueue().length > 0;
    if (!hasQueue) {
      playSongInCollection(songs[0], playlistWithSongs, true);
    } else {
      shuffleCollectionToQueue(playlistWithSongs);
    }
    close();
  };

  const handleGoToPlaylist = () => {
    if (!playlist) return;
    close();
    navigation.navigate('(home)', { screen: 'playlistView', params: { id: playlist.id } });
  };

  const handleDownload = async () => {
    if (!playlist || isDownloaded || isDownloading) return;
    await downloadPlaylistById(playlist.id, songs);
  };

  const handleDeletePress = () => {
    if (!playlist || playlist.id === FAVORITES_ID) return;
    Alert.alert(
      t('playlistOptions.delete.title'),
      t('playlistOptions.delete.body', { title: playlist.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlaylist.mutateAsync(playlist.id);
              close();
              if (hideGoToPlaylist) {
                navigation.goBack();
              }
              toast.success(t('playlistOptions.toasts.deleted'));
            } catch {
              toast.error(t('playlistOptions.toasts.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  if (!playlist) {
    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        backgroundStyle={[styles.sheetBackground, sheetBg]}
      >
        <View style={[styles.loading, sheetBg]}>
          <ActivityIndicator size="large" color={colors.subtext} />
        </View>
      </BottomSheetModal>
    );
  }

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      backgroundStyle={[styles.sheetBackground, sheetBg]}
      stackBehavior="push"
      onChange={(index) => setIsSheetOpen(index >= 0)}
    >
      <BottomSheetScrollView
        style={sheetBg}
        contentContainerStyle={styles.sheetContent}
      >
        <View style={styles.header}>
          <MediaImage cover={playlist.cover} size="grid" style={styles.cover} />
          <View style={styles.headerText}>
            <Text
              style={[styles.title, { color: colors.secondary }]}
              numberOfLines={2}
            >
              {playlist.title}
            </Text>
            <Text style={[styles.artist, { color: colors.subtext }]}>{t('playlistOptions.playlistLabel')}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <TouchableOpacity
          style={[styles.option, playbackDisabled && styles.optionDisabled]}
          onPress={() => handlePlay(false)}
          disabled={playbackDisabled}
        >
          {songsLoading ? (
            <ActivityIndicator size="small" color={colors.subtext} />
          ) : (
            <Play size={26} color={colors.secondary} fill={colors.secondary} />
          )}
          <Text style={[styles.optionText, { color: colors.secondary }]}>{t('playlistOptions.actions.play')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, playbackDisabled && styles.optionDisabled]}
          onPress={() => handlePlay(true)}
          disabled={playbackDisabled}
        >
          <Shuffle size={26} color={colors.secondary} />
          <Text style={[styles.optionText, { color: colors.secondary }]}>{t('playlistOptions.actions.shuffle')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, playbackDisabled && styles.optionDisabled]}
          onPress={handleAddToQueue}
          disabled={playbackDisabled}
        >
          <ListEnd size={26} color={colors.secondary} />
          <Text style={[styles.optionText, { color: colors.secondary }]}>{t('playlistOptions.actions.addToQueue')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, playbackDisabled && styles.optionDisabled]}
          onPress={handleShuffleToQueue}
          disabled={playbackDisabled}
        >
          <Shuffle size={26} color={colors.secondary} />
          <Text style={[styles.optionText, { color: colors.secondary }]}>{t('playlistOptions.actions.shuffleToQueue')}</Text>
        </TouchableOpacity>

        {!hideGoToPlaylist && (
          <TouchableOpacity style={styles.option} onPress={handleGoToPlaylist}>
            <List size={26} color={colors.secondary} />
            <Text style={[styles.optionText, { color: colors.secondary }]}>{t('playlistOptions.actions.goToPlaylist')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.option}
          onPress={handleDownload}
          disabled={isDownloaded || isDownloading}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color={colors.subtext} />
          ) : isDownloaded ? (
            <CheckCircle size={26} color={colors.subtext} />
          ) : (
            <ArrowDownCircle size={26} color={colors.secondary} />
          )}
          <Text
            style={[
              styles.optionText,
              { color: colors.secondary },
              (isDownloaded || isDownloading) && { opacity: 0.6 },
            ]}
          >
            {isDownloading ? t('playlistOptions.actions.downloading') : isDownloaded ? t('playlistOptions.actions.downloaded') : t('playlistOptions.actions.download')}
          </Text>
        </TouchableOpacity>

        {playlist.id !== FAVORITES_ID && (
          <TouchableOpacity
            style={styles.option}
            onPress={handleDeletePress}
            disabled={deletePlaylist.isPending}
          >
            {deletePlaylist.isPending ? (
              <ActivityIndicator size="small" color={colors.subtext} />
            ) : (
              <Trash2 size={26} color="#ff3b30" />
            )}
            <Text
              style={[
                styles.optionText,
                { color: '#ff3b30' },
                deletePlaylist.isPending && { opacity: 0.6 },
              ]}
            >
              {t('playlistOptions.actions.delete')}
            </Text>
          </TouchableOpacity>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.sectionLabel, { color: colors.subtext }]}>{t('playlistOptions.sections.info')}</Text>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('playlistOptions.info.lastChanged')}</Text>
          <Text style={[styles.infoValue, { color: colors.secondary }]}>
            {formatDate(playlist.changed)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('playlistOptions.info.created')}</Text>
          <Text style={[styles.infoValue, { color: colors.secondary }]}>
            {formatDate(playlist.created)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('playlistOptions.info.songs')}</Text>
          <Text style={[styles.infoValue, { color: colors.secondary }]}>{songs.length}</Text>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

PlaylistOptions.displayName = 'PlaylistOptions';

export default PlaylistOptions;

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
  },
  headerText: { flex: 1 },
  title: { fontSize: 16, fontWeight: '500' },
  artist: { fontSize: 14, marginTop: 2 },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  optionDisabled: {
    opacity: 0.55,
  },
  optionText: { marginLeft: 16, fontSize: 16, fontWeight: '500' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500', marginLeft: 12, flex: 1, textAlign: 'right' },
});
