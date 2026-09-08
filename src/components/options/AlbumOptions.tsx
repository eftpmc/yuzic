import React, { forwardRef, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Heart, ListEnd, ListStart, Play, Shuffle, Disc, CheckCircle, ArrowDownCircle, Globe, Share2 } from 'lucide-react-native';
import { toast } from '@backpackapp-io/react-native-toast';
import { useApi } from '@/api';
import { shareItem } from '@/utils/share';

import { Album, AlbumBase } from '@/types';
import { useSelector } from 'react-redux';
import { selectAlbumPlayCount } from '@/utils/redux/selectors/statsSelectors';
import { usePlaying } from '@/contexts/PlayingContext';
import { useDownload } from '@/contexts/DownloadContext';
import { useRouter } from 'expo-router';
import { useEnabledExternalSources } from '@/features/sources/registry';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { useLazyAlbumDetail } from './useLazyCollectionDetails';
import { useStarredAlbums, useStarAlbum, useUnstarAlbum } from '@/hooks/starred';
import {
  OptionSheetChipsRow,
  OptionSheetDivider,
  OptionSheetHeader,
  OptionSheetInfoRow,
  OptionSheetRow,
  OptionSheetSectionLabel,
  optionSheetStyles,
  useOptionSheetBackground,
} from './OptionSheetPrimitives';
import { iconSize, statusColor } from '@/constants/design';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import haptics from '@/utils/haptics';

export type AlbumOptionsProps = {
  album: AlbumBase | Album | null;
  /** Hide "Go to Album" when already on the album screen */
  hideGoToAlbum?: boolean;
};

const AlbumOptions = forwardRef<
  BottomSheetModal,
  AlbumOptionsProps
>(({ album, hideGoToAlbum }, ref) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const enabledSources = useEnabledExternalSources();

  const {
    playSongInCollection,
    addCollectionToQueue,
    shuffleCollectionToQueue,
    getQueue,
    currentSong,
    playNext,
  } = usePlaying();

  const { downloadAlbumById, getCollectionDownloadState } =
    useDownload();

  const { albums: starredAlbums } = useStarredAlbums();
  const starAlbum = useStarAlbum();
  const unstarAlbum = useUnstarAlbum();

  const snapPoints = useMemo(() => ['55%', '90%'], []);
  const playCount = useSelector(selectAlbumPlayCount(album?.id ?? ''));
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const api = useApi();
  const { albumWithSongs, songs, songsLoading } = useLazyAlbumDetail(album, isSheetOpen);

  const isStarred = starredAlbums.some(a => a.id === album?.id);

  const sheetBg = useOptionSheetBackground();

  const close = () => {
    (ref as any)?.current?.dismiss();
  };

  const toggleFavorite = async () => {
    haptics.selection();
    if (!album) return;
    try {
      if (isStarred) {
        await unstarAlbum.mutateAsync(album.id);
        toast.success(t('albumOptions.toasts.removedFromFavorites', { title: album.title }));
      } else {
        await starAlbum.mutateAsync(album.id);
        toast.success(t('albumOptions.toasts.addedToFavorites', { title: album.title }));
      }
    } catch {
      toast.error(t('albumOptions.toasts.updateFavoritesFailed'));
    } finally {
      close();
    }
  };

  const songIds = useMemo(() => songs.map(s => s.id), [songs]);
  const { isDownloaded, isDownloading } = getCollectionDownloadState(songIds);
  const playbackDisabled = songsLoading || !songs.length;

  const handlePlay = (shuffle: boolean) => {
    if (!albumWithSongs || playbackDisabled) return;
    playSongInCollection(songs[0], albumWithSongs, shuffle);
    close();
  };

  const handleAddToNext = () => {
    if (!albumWithSongs || playbackDisabled) return;
    if (!currentSong) {
      toast.error(t('songOptions.toasts.nothingPlaying'));
      return;
    }
    [...songs].reverse().forEach(song => playNext(song));
    toast.success(t('albumOptions.toasts.addedNext', { title: albumWithSongs.title }));
    close();
  };

  const handleAddToEnd = () => {
    if (!albumWithSongs || playbackDisabled) return;
    const hasQueue = getQueue().length > 0;
    if (!hasQueue) {
      playSongInCollection(songs[0], albumWithSongs, false);
    } else {
      addCollectionToQueue(albumWithSongs);
      toast.success(t('albumOptions.toasts.addedToEnd', { title: albumWithSongs.title }));
    }
    close();
  };

  const handleShuffleToQueue = () => {
    if (!albumWithSongs || playbackDisabled) return;
    const hasQueue = getQueue().length > 0;
    if (!hasQueue) {
      playSongInCollection(songs[0], albumWithSongs, true);
    } else {
      shuffleCollectionToQueue(albumWithSongs);
      toast.success(t('albumOptions.toasts.shuffledToQueue', { title: albumWithSongs.title }));
    }
    close();
  };

  const handleGoToAlbum = () => {
    if (!album) return;
    close();
    router.push({ pathname: '/albumView', params: { id: album.id } });
  };

  // Recovery path for fuzzy-match false positives, mirroring ArtistOptions:
  // library matching falls back to normalized title + artist comparison, so a
  // different album sharing a common title can produce a false-positive local
  // match. forceExternal makes the unified album screen skip its local-match
  // step and resolve the album externally by artist + title.
  const handleViewExternal = () => {
    if (!album?.artist?.name) return;
    close();
    router.push({
      pathname: '/albumView',
      params: {
        forceExternal: 'true',
        artist: album.artist.name,
        title: album.title,
      },
    });
  };


  const handleShare = async () => {
    if (!album || !api.shares || isSharing) return;
    haptics.selection();
    setIsSharing(true);
    try {
      const created = await api.shares.create({
        itemId: album.id,
        description: album.title,
      });
      if (!created?.url) {
        toast.error(t('albumOptions.toasts.shareFailed'));
        return;
      }
      const shared = await shareItem({
        url: created.url,
        title: album.title,
        message: `${album.title}${album.artist?.name ? ` — ${album.artist.name}` : ''}`,
      });
      if (shared) close();
    } catch {
      toast.error(t('albumOptions.toasts.shareFailed'));
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    if (!album || isDownloaded || isDownloading) return;
    await downloadAlbumById(album.id, songs);
  };

  if (!album) {
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
          <SpinningLoaderCircle size={iconSize.loader} color={colors.subtext} />
        </View>
      </BottomSheetModal>
    );
  }

  return (
    <>
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
          cover={album.cover}
          title={album.title}
          subtitle={album.artist?.name ?? ''}
          titleLines={2}
        />

        <OptionSheetDivider />

        <OptionSheetRow
          icon={<Heart size={iconSize.loader} color={statusColor.favorite} fill={isStarred ? statusColor.favorite : 'none'} />}
          label={isStarred ? t('albumOptions.actions.unfavorite') : t('albumOptions.actions.favorite')}
          onPress={toggleFavorite}
        />

        <OptionSheetRow
          icon={<Play size={iconSize.loader} color={colors.secondary} fill={colors.secondary} />}
          label={t('albumOptions.actions.play')}
          onPress={() => handlePlay(false)}
          disabled={playbackDisabled}
          dimRow={playbackDisabled}
          loading={songsLoading}
        />
        <OptionSheetRow
          icon={<Shuffle size={iconSize.loader} color={colors.secondary} />}
          label={t('albumOptions.actions.shuffle')}
          onPress={() => handlePlay(true)}
          disabled={playbackDisabled}
          dimRow={playbackDisabled}
        />
        <OptionSheetRow
          icon={<ListStart size={iconSize.loader} color={colors.secondary} />}
          label={t('albumOptions.actions.addToNext')}
          onPress={handleAddToNext}
          disabled={playbackDisabled}
          dimRow={playbackDisabled}
        />
        <OptionSheetRow
          icon={<ListEnd size={iconSize.loader} color={colors.secondary} />}
          label={t('albumOptions.actions.addToEnd')}
          onPress={handleAddToEnd}
          disabled={playbackDisabled}
          dimRow={playbackDisabled}
        />
        <OptionSheetRow
          icon={<Shuffle size={iconSize.loader} color={colors.secondary} />}
          label={t('albumOptions.actions.shuffleToQueue')}
          onPress={handleShuffleToQueue}
          disabled={playbackDisabled}
          dimRow={playbackDisabled}
        />

        {!hideGoToAlbum && (
          <OptionSheetRow
            icon={<Disc size={iconSize.loader} color={colors.secondary} />}
            label={t('albumOptions.actions.goToAlbum')}
            onPress={handleGoToAlbum}
          />
        )}

        {enabledSources.length > 0 && !!album.artist?.name && (
          <OptionSheetRow
            icon={<Globe size={iconSize.loader} color={colors.secondary} />}
            label={t('albumOptions.actions.viewExternal')}
            onPress={handleViewExternal}
          />
        )}

        {api.shares && (
          <OptionSheetRow
            icon={<Share2 size={iconSize.loader} color={colors.secondary} />}
            label={t('albumOptions.actions.share')}
            onPress={handleShare}
            disabled={isSharing}
            loading={isSharing}
          />
        )}

        <OptionSheetRow
          icon={
            isDownloaded ? (
              <CheckCircle size={iconSize.loader} color={colors.subtext} />
            ) : (
              <ArrowDownCircle size={iconSize.loader} color={colors.secondary} />
            )
          }
          label={isDownloading ? t('albumOptions.actions.downloading') : isDownloaded ? t('albumOptions.actions.downloaded') : t('albumOptions.actions.download')}
          onPress={handleDownload}
          disabled={isDownloaded || isDownloading}
          loading={isDownloading}
          dimLabel={isDownloaded || isDownloading}
        />

        <OptionSheetDivider />

        <OptionSheetSectionLabel label={t('albumOptions.sections.albumInfo')} />
        <OptionSheetInfoRow
          label={t('albumOptions.info.artist')}
          value={album.artist?.name ?? t('albumOptions.info.unknown')}
          valueLines={1}
        />
        <OptionSheetInfoRow
          label={t('albumOptions.info.year')}
          value={album.year ?? t('albumOptions.info.unknown')}
        />
        {album.genres?.length ? (
          <OptionSheetChipsRow label={t('albumOptions.info.genres')} values={album.genres} />
        ) : (
          <OptionSheetInfoRow
            label={t('albumOptions.info.genres')}
            value={t('albumOptions.info.unknown')}
          />
        )}
        <OptionSheetInfoRow label={t('albumOptions.info.songs')} value={songs.length} />
        <OptionSheetInfoRow label={t('albumOptions.info.plays')} value={playCount} />
      </BottomSheetScrollView>
    </BottomSheetModal>
    </>
  );
});

AlbumOptions.displayName = 'AlbumOptions';

export default AlbumOptions;
