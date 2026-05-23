import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { ListEnd, Play, Shuffle, CheckCircle, ArrowDownCircle, User, Globe } from 'lucide-react-native';

import { Artist, Song } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import { usePlayingActions } from '@/contexts/PlayingContext';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useEnabledExternalSources } from '@/features/sources/registry';
import { useMatchedNavigation } from '@/features/sources/useMatchedNavigation';
import { selectArtistPlayCount } from '@/utils/redux/selectors/statsSelectors';
import { useTheme } from '@/hooks/useTheme';
import { useArtistAlbums } from '@/hooks/artists';
import { useTranslation } from 'react-i18next';
import { useDownload } from '@/contexts/DownloadContext';
import { toast } from '@backpackapp-io/react-native-toast';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { useLazyArtistSongs } from './useLazyCollectionDetails';

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
  const { isDarkMode, colors } = useTheme();
  const navigation = useNavigation<any>();

  const {
    playSongInCollection,
    addCollectionToQueue,
    shuffleCollectionToQueue,
    getQueue,
  } = usePlayingActions();
  const { downloadAlbumById, getCollectionDownloadState } = useDownload();
  const enabledSources = useEnabledExternalSources();
  const { navigateToArtist } = useMatchedNavigation();
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const snapPoints = useMemo(() => ['55%', '90%'], []);
  const playCount = useSelector(selectArtistPlayCount(artist?.id ?? ''));

  const artistAlbums = useArtistAlbums(artist?.id ?? '');
  const { songs: artistSongs, songsLoading } = useLazyArtistSongs(
    artist?.id,
    artistAlbums,
    isSheetOpen
  );


  const sheetBg = { backgroundColor: isDarkMode ? colors.card : colors.background };

  const close = () => {
    (ref as any)?.current?.dismiss();
  };

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
    navigation.navigate('(home)', {
      screen: 'artistView',
      params: { id: artist.id },
    });
  };

  const handleViewExternal = useCallback(() => {
    if (!artist) return;
    close();
    navigateToArtist({
      id: artist.mbid ?? artist.name,
      name: artist.name,
      cover: artist.cover,
      subtext: artist.subtext,
      externalIds: artist.mbid ? { mbid: artist.mbid } : undefined,
    }, { skipLocalMatch: true });
  }, [artist, navigateToArtist]);


  const { isDownloaded, isDownloading: isCollectionDownloading } = getCollectionDownloadState(
    artistSongs.map(s => s.id)
  );
  const isDownloading = isDownloadingAll || isCollectionDownloading;
  const playbackDisabled = songsLoading || !artistSongs.length;

  const handleDownloadAll = async () => {
    if (!artist || isDownloaded || isDownloading || !artistAlbums.length) return;
    setIsDownloadingAll(true);
    try {
      for (const album of artistAlbums) {
        await downloadAlbumById(album.id);
      }
    } catch {
      toast.error(t('artistOptions.downloadAllFailed'));
    } finally {
      setIsDownloadingAll(false);
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
        backgroundStyle={[styles.sheetBackground, sheetBg]}
      >
        <View style={[styles.loading, sheetBg]}>
          <ActivityIndicator size="large" color={colors.subtext} />
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
      backgroundStyle={[styles.sheetBackground, sheetBg]}
      stackBehavior="push"
      onChange={(index) => setIsSheetOpen(index >= 0)}
    >
      <BottomSheetScrollView
        style={sheetBg}
        contentContainerStyle={styles.sheetContent}
      >
        <View style={styles.header}>
          <MediaImage cover={artist.cover} size="grid" style={styles.cover} />
          <View style={styles.headerText}>
            <Text
              style={[styles.title, { color: colors.secondary }]}
              numberOfLines={2}
            >
              {artist.name}
            </Text>
            <Text style={[styles.artist, { color: colors.subtext }]}>{t('artistOptions.artistLabel')}</Text>
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
          <Text style={[styles.optionText, { color: colors.secondary }]}>{t('artistOptions.actions.play')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, playbackDisabled && styles.optionDisabled]}
          onPress={() => handlePlay(true)}
          disabled={playbackDisabled}
        >
          <Shuffle size={26} color={colors.secondary} />
          <Text style={[styles.optionText, { color: colors.secondary }]}>{t('artistOptions.actions.shuffle')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, playbackDisabled && styles.optionDisabled]}
          onPress={handleAddToQueue}
          disabled={playbackDisabled}
        >
          <ListEnd size={26} color={colors.secondary} />
          <Text style={[styles.optionText, { color: colors.secondary }]}>{t('artistOptions.actions.addToQueue')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, playbackDisabled && styles.optionDisabled]}
          onPress={handleShuffleToQueue}
          disabled={playbackDisabled}
        >
          <Shuffle size={26} color={colors.secondary} />
          <Text style={[styles.optionText, { color: colors.secondary }]}>{t('artistOptions.actions.shuffleToQueue')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.option}
          onPress={() => { void handleDownloadAll(); }}
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
            {isDownloading
              ? t('artistOptions.actions.downloading')
              : isDownloaded
                ? t('artistOptions.actions.downloaded')
                : t('artistOptions.actions.download')}
          </Text>
        </TouchableOpacity>

        {!hideGoToArtist && (
          <TouchableOpacity style={styles.option} onPress={handleGoToArtist}>
            <User size={26} color={colors.secondary} />
            <Text style={[styles.optionText, { color: colors.secondary }]}>{t('artistOptions.actions.goToArtist')}</Text>
          </TouchableOpacity>
        )}

        {enabledSources.length > 0 && (
          <TouchableOpacity style={styles.option} onPress={handleViewExternal}>
            <Globe size={26} color={colors.secondary} />
            <Text style={[styles.optionText, { color: colors.secondary }]}>{t('artistOptions.actions.viewExternal')}</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.sectionLabel, { color: colors.subtext }]}>{t('artistOptions.sections.info')}</Text>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('artistOptions.info.albums')}</Text>
          <Text style={[styles.infoValue, { color: colors.secondary }]}>
            {artistAlbums.length}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('artistOptions.info.plays')}</Text>
          <Text style={[styles.infoValue, { color: colors.secondary }]}>{playCount}</Text>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
    </>
  );
});

ArtistOptions.displayName = 'ArtistOptions';

export default ArtistOptions;

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
