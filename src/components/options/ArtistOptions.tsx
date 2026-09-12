import React, { forwardRef, useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { ListEnd, Play, Shuffle, CheckCircle, ArrowDownCircle, User, Globe, Sparkles } from 'lucide-react-native';

import { Artist, Song } from '@/types';
import { usePlayingActions } from '@/contexts/PlayingContext';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { useEnabledExternalSources } from '@/features/sources/registry';
import { selectArtistPlayCount } from '@/utils/redux/selectors/statsSelectors';
import { selectAudiomuseConfig } from '@/utils/redux/selectors/audiomuseSelectors';
import { useCanGeneratePlaylist, generateForArtist } from '@/features/audiomuse/generateFromEntity';
import { useApi } from '@/api';
import { useTheme } from '@/hooks/useTheme';
import { useArtistAlbums } from '@/hooks/artists';
import { useTranslation } from 'react-i18next';
import { useDownload } from '@/contexts/DownloadContext';
import { toast } from '@backpackapp-io/react-native-toast';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { useLazyArtistSongs } from './useLazyCollectionDetails';
import {
  OptionSheetDivider,
  OptionSheetHeader,
  OptionSheetInfoRow,
  OptionSheetRow,
  OptionSheetSectionLabel,
  optionSheetStyles,
  useOptionSheetBackground,
} from './OptionSheetPrimitives';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { iconSize } from '@/constants/design';

export type ArtistOptionsProps = {
  artist: Artist | null;
  /** Hide "Go to Artist" when already on the artist screen */
  hideGoToArtist?: boolean;
};

const ArtistOptions = forwardRef<
  BottomSheetModal,
  ArtistOptionsProps
>(({ artist, hideGoToArtist }, ref) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const {
    playSongInCollection,
    addCollectionToQueue,
    shuffleCollectionToQueue,
    getQueue,
  } = usePlayingActions();
  const { downloadAlbumById, getCollectionDownloadState } = useDownload();
  const enabledSources = useEnabledExternalSources();
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isGeneratingPlaylist, setIsGeneratingPlaylist] = useState(false);
  const generatePlaylistInFlightRef = useRef(false);
  const api = useApi();
  const audiomuseConfig = useSelector(selectAudiomuseConfig);
  const canGeneratePlaylist = useCanGeneratePlaylist();

  const snapPoints = useMemo(() => ['55%', '90%'], []);
  const playCount = useSelector(selectArtistPlayCount(artist?.id ?? ''));

  const artistAlbums = useArtistAlbums(artist?.id ?? '');
  const { songs: artistSongs, songsLoading } = useLazyArtistSongs(
    artist?.id,
    artistAlbums,
    isSheetOpen
  );


  const sheetBg = useOptionSheetBackground();

  const close = useCallback(() => {
    (ref as any)?.current?.dismiss();
  }, [ref]);

  const buildCollection = useCallback(
    (songs: Song[]) => ({
      id: artist!.id,
      title: artist!.name,
      artist: {
        id: artist!.id,
        name: artist!.name,
        cover: artist!.cover,
        subtext: t('artistOptions.artistLabel'),
      },
      cover: artist!.cover,
      subtext: t('artistOptions.artistLabel'),
      songs,
      changed: new Date('1995-12-17T03:24:00'),
      created: new Date('1995-12-17T03:24:00'),
    }),
    [artist, t]
  );

  const handlePlay = (shuffle: boolean) => {
    if (!artist || songsLoading || !artistSongs.length) return;
    const collection = buildCollection(artistSongs);
    playSongInCollection(artistSongs[0], collection, shuffle);
    close();
  };

  const handleAddToQueue = () => {
    if (!artist || songsLoading || !artistSongs.length) return;
    const collection = buildCollection(artistSongs);
    const hasQueue = getQueue().length > 0;
    if (!hasQueue) {
      playSongInCollection(artistSongs[0], collection, false);
    } else {
      addCollectionToQueue(collection);
    }
    close();
  };

  const handleShuffleToQueue = () => {
    if (!artist || songsLoading || !artistSongs.length) return;
    const collection = buildCollection(artistSongs);
    const hasQueue = getQueue().length > 0;
    if (!hasQueue) {
      playSongInCollection(artistSongs[0], collection, true);
    } else {
      shuffleCollectionToQueue(collection);
    }
    close();
  };

  const handleGoToArtist = () => {
    if (!artist) return;
    close();
    router.push({ pathname: '/artistView', params: { id: artist.id } });
  };

  // Recovery path for fuzzy-match false positives: local library matching
  // falls back to normalized-name comparison when no mbid is available on
  // either side, so two different artists sharing a common name (tribute
  // bands, common band names) can produce a false-positive local match.
  // This forces the unified artist screen to render in external-only mode
  // directly, skipping the local-match step, instead of navigating to a
  // separate screen.
  const handleViewExternal = useCallback(() => {
    if (!artist) return;
    close();
    router.push({
      pathname: '/artistView',
      params: {
        forceExternal: 'true',
        mbid: artist.mbid ?? undefined,
        name: artist.name,
      },
    });
  }, [artist, router, close]);


  const { isDownloaded, isDownloading: isCollectionDownloading } = getCollectionDownloadState(
    artistSongs.map(s => s.id)
  );
  const isDownloading = isDownloadingAll || isCollectionDownloading;
  const playbackDisabled = songsLoading || !artistSongs.length;

  const handleDownloadAll = async () => {
    if (!artist || isDownloaded || isDownloading || !artistAlbums.length) return;
    setIsDownloadingAll(true);
    try {
      await Promise.all(artistAlbums.map(album => downloadAlbumById(album.id)));
    } catch {
      toast.error(t('artistOptions.downloadAllFailed'));
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const handleGeneratePlaylist = async () => {
    if (generatePlaylistInFlightRef.current || !artist || !artistSongs.length) return;
    generatePlaylistInFlightRef.current = true;
    setIsGeneratingPlaylist(true);
    try {
      const result = await generateForArtist(api, audiomuseConfig, artist, artistSongs, { size: 25 });
      toast.success(t('artistOptions.toasts.playlistGenerated', { count: result.trackCount }));
      close();
      router.push({ pathname: '/playlistView', params: { id: result.playlistId } });
    } catch {
      toast.error(t('artistOptions.toasts.playlistGenerationFailed'));
    } finally {
      generatePlaylistInFlightRef.current = false;
      setIsGeneratingPlaylist(false);
    }
  };

  if (!artist) {
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
        testID="artist-options-sheet"
        style={sheetBg}
        contentContainerStyle={optionSheetStyles.sheetContent}
      >
        <OptionSheetHeader
          cover={artist.cover}
          title={artist.name}
          subtitle={t('artistOptions.artistLabel')}
          titleLines={2}
        />

        <OptionSheetDivider />

        <OptionSheetRow
          icon={<Play size={iconSize.loader} color={colors.secondary} fill={colors.secondary} />}
          label={t('artistOptions.actions.play')}
          onPress={() => handlePlay(false)}
          disabled={playbackDisabled}
          dimRow={playbackDisabled}
          loading={songsLoading}
        />
        <OptionSheetRow
          icon={<Shuffle size={iconSize.loader} color={colors.secondary} />}
          label={t('artistOptions.actions.shuffle')}
          onPress={() => handlePlay(true)}
          disabled={playbackDisabled}
          dimRow={playbackDisabled}
        />
        <OptionSheetRow
          icon={<ListEnd size={iconSize.loader} color={colors.secondary} />}
          label={t('artistOptions.actions.addToQueue')}
          onPress={handleAddToQueue}
          disabled={playbackDisabled}
          dimRow={playbackDisabled}
        />
        <OptionSheetRow
          icon={<Shuffle size={iconSize.loader} color={colors.secondary} />}
          label={t('artistOptions.actions.shuffleToQueue')}
          onPress={handleShuffleToQueue}
          disabled={playbackDisabled}
          dimRow={playbackDisabled}
        />

        {canGeneratePlaylist && (
          <OptionSheetRow
            icon={<Sparkles size={iconSize.loader} color={colors.secondary} />}
            label={t('artistOptions.actions.generatePlaylist')}
            onPress={handleGeneratePlaylist}
            disabled={isGeneratingPlaylist || playbackDisabled}
            loading={isGeneratingPlaylist}
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
          label={isDownloading
            ? t('artistOptions.actions.downloading')
            : isDownloaded
              ? t('artistOptions.actions.downloaded')
              : t('artistOptions.actions.download')}
          onPress={() => { void handleDownloadAll(); }}
          disabled={isDownloaded || isDownloading}
          loading={isDownloading}
          dimLabel={isDownloaded || isDownloading}
        />

        {!hideGoToArtist && (
          <OptionSheetRow
            icon={<User size={iconSize.loader} color={colors.secondary} />}
            label={t('artistOptions.actions.goToArtist')}
            onPress={handleGoToArtist}
          />
        )}

        {enabledSources.length > 0 && (
          <OptionSheetRow
            icon={<Globe size={iconSize.loader} color={colors.secondary} />}
            label={t('artistOptions.actions.viewExternal')}
            onPress={handleViewExternal}
          />
        )}

        <OptionSheetDivider />

        <OptionSheetSectionLabel label={t('artistOptions.sections.info')} />
        <OptionSheetInfoRow label={t('artistOptions.info.albums')} value={artistAlbums.length} />
        <OptionSheetInfoRow label={t('artistOptions.info.plays')} value={playCount} />
      </BottomSheetScrollView>
    </BottomSheetModal>
    </>
  );
});

ArtistOptions.displayName = 'ArtistOptions';

export default ArtistOptions;
