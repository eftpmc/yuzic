import React, { forwardRef, useMemo, useState } from 'react';
import { View, Alert } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { ListEnd, Play, Shuffle, List, CheckCircle, ArrowDownCircle, Trash2, Pencil, Share2 } from 'lucide-react-native';
import { useApi } from '@/api';
import { shareItem } from '@/utils/share';
import haptics from '@/utils/haptics';
import { toast } from '@backpackapp-io/react-native-toast';

import { Playlist, PlaylistBase } from '@/types';
import { usePlayingActions } from '@/contexts/PlayingContext';
import { useDownload } from '@/contexts/DownloadContext';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useDeletePlaylist, useRenamePlaylist } from '@/hooks/playlists';
import { FAVORITES_ID } from '@/constants/favorites';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { useLazyPlaylistDetail } from './useLazyCollectionDetails';
import {
  OptionSheetDivider,
  OptionSheetHeader,
  OptionSheetInfoRow,
  OptionSheetRow,
  OptionSheetSectionLabel,
  optionSheetStyles,
  useOptionSheetBackground,
} from './OptionSheetPrimitives';
import { statusColor } from '@/constants/design';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';

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
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const router = useRouter();

  const {
    playSongInCollection,
    addCollectionToQueue,
    shuffleCollectionToQueue,
    getQueue,
  } = usePlayingActions();

  const { downloadPlaylistById, getCollectionDownloadState } =
    useDownload();

  const deletePlaylist = useDeletePlaylist();
  const renamePlaylist = useRenamePlaylist();
  const api = useApi();

  const snapPoints = useMemo(() => ['55%', '90%'], []);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const { playlistWithSongs, songs, songsLoading } = useLazyPlaylistDetail(playlist, isSheetOpen);

  const handleShare = async () => {
    if (!playlist || !api.shares || isSharing) return;
    haptics.selection();
    setIsSharing(true);
    try {
      const created = await api.shares.create({
        itemId: playlist.id,
        description: playlist.title,
      });
      if (!created?.url) {
        toast.error(t('playlistOptions.toasts.shareFailed'));
        return;
      }
      const shared = await shareItem({
        url: created.url,
        title: playlist.title,
        message: playlist.title,
      });
      if (shared) close();
    } catch {
      toast.error(t('playlistOptions.toasts.shareFailed'));
    } finally {
      setIsSharing(false);
    }
  };

  const sheetBg = useOptionSheetBackground();

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
    router.push({ pathname: '/playlistView', params: { id: playlist.id } });
  };

  const handleDownload = async () => {
    if (!playlist || isDownloaded || isDownloading) return;
    await downloadPlaylistById(playlist.id, songs);
  };

  const handleRenamePress = () => {
    if (!playlist || playlist.id === FAVORITES_ID) return;
    Alert.prompt(
      t('playlistOptions.rename.title'),
      undefined,
      async (newName) => {
        const trimmed = newName?.trim();
        if (!trimmed || trimmed === playlist.title) return;
        try {
          await renamePlaylist.mutateAsync({ id: playlist.id, newName: trimmed });
          toast.success(t('playlistOptions.toasts.renamed'));
        } catch {
          toast.error(t('playlistOptions.toasts.renameFailed'));
        }
      },
      'plain-text',
      playlist.title,
      t('playlistOptions.rename.placeholder')
    );
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
        backgroundStyle={[optionSheetStyles.sheetBackground, sheetBg]}
      >
        <View style={[optionSheetStyles.loading, sheetBg]}>
          <SpinningLoaderCircle size={26} color={colors.subtext} />
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
      backgroundStyle={[optionSheetStyles.sheetBackground, sheetBg]}
      stackBehavior="push"
      onChange={(index) => setIsSheetOpen(index >= 0)}
    >
      <BottomSheetScrollView
        style={sheetBg}
        contentContainerStyle={optionSheetStyles.sheetContent}
      >
        <OptionSheetHeader
          cover={playlist.cover}
          title={playlist.title}
          subtitle={t('playlistOptions.playlistLabel')}
          titleLines={2}
        />

        <OptionSheetDivider />

        <OptionSheetRow
          icon={<Play size={26} color={colors.secondary} fill={colors.secondary} />}
          label={t('playlistOptions.actions.play')}
          onPress={() => handlePlay(false)}
          disabled={playbackDisabled}
          dimRow={playbackDisabled}
          loading={songsLoading}
        />
        <OptionSheetRow
          icon={<Shuffle size={26} color={colors.secondary} />}
          label={t('playlistOptions.actions.shuffle')}
          onPress={() => handlePlay(true)}
          disabled={playbackDisabled}
          dimRow={playbackDisabled}
        />
        <OptionSheetRow
          icon={<ListEnd size={26} color={colors.secondary} />}
          label={t('playlistOptions.actions.addToQueue')}
          onPress={handleAddToQueue}
          disabled={playbackDisabled}
          dimRow={playbackDisabled}
        />
        <OptionSheetRow
          icon={<Shuffle size={26} color={colors.secondary} />}
          label={t('playlistOptions.actions.shuffleToQueue')}
          onPress={handleShuffleToQueue}
          disabled={playbackDisabled}
          dimRow={playbackDisabled}
        />

        {!hideGoToPlaylist && (
          <OptionSheetRow
            icon={<List size={26} color={colors.secondary} />}
            label={t('playlistOptions.actions.goToPlaylist')}
            onPress={handleGoToPlaylist}
          />
        )}

        <OptionSheetRow
          icon={
            isDownloaded ? (
              <CheckCircle size={26} color={colors.subtext} />
            ) : (
              <ArrowDownCircle size={26} color={colors.secondary} />
            )
          }
          label={isDownloading ? t('playlistOptions.actions.downloading') : isDownloaded ? t('playlistOptions.actions.downloaded') : t('playlistOptions.actions.download')}
          onPress={handleDownload}
          disabled={isDownloaded || isDownloading}
          loading={isDownloading}
          dimLabel={isDownloaded || isDownloading}
        />

        {api.shares && (
          <OptionSheetRow
            icon={<Share2 size={26} color={colors.secondary} />}
            label={t('playlistOptions.actions.share')}
            onPress={handleShare}
            disabled={isSharing}
            loading={isSharing}
          />
        )}

        {playlist.id !== FAVORITES_ID && (
          <OptionSheetRow
            icon={<Pencil size={26} color={colors.secondary} />}
            label={t('playlistOptions.actions.rename')}
            onPress={handleRenamePress}
          />
        )}

        {playlist.id !== FAVORITES_ID && (
          <OptionSheetRow
            icon={<Trash2 size={26} color={statusColor.destructive} />}
            label={t('playlistOptions.actions.delete')}
            labelColor={statusColor.destructive}
            onPress={handleDeletePress}
            disabled={deletePlaylist.isPending}
            loading={deletePlaylist.isPending}
            dimLabel={deletePlaylist.isPending}
          />
        )}

        <OptionSheetDivider />

        <OptionSheetSectionLabel label={t('playlistOptions.sections.info')} />
        <OptionSheetInfoRow
          label={t('playlistOptions.info.lastChanged')}
          value={formatDate(playlist.changed)}
        />
        <OptionSheetInfoRow
          label={t('playlistOptions.info.created')}
          value={formatDate(playlist.created)}
        />
        <OptionSheetInfoRow label={t('playlistOptions.info.songs')} value={songs.length} />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

PlaylistOptions.displayName = 'PlaylistOptions';

export default PlaylistOptions;
