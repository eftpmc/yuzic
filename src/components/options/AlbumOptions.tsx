import React, { forwardRef, useMemo, useState } from 'react';
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
import { ListEnd, ListStart, Play, Shuffle, Disc, CheckCircle, ArrowDownCircle } from 'lucide-react-native';
import { toast } from '@backpackapp-io/react-native-toast';

import { Album, AlbumBase } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import { useSelector } from 'react-redux';
import { selectAlbumPlayCount } from '@/utils/redux/selectors/statsSelectors';
import { usePlaying } from '@/contexts/PlayingContext';
import { useDownload } from '@/contexts/DownloadContext';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { useLazyAlbumDetail } from './useLazyCollectionDetails';

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
  const { isDarkMode, colors } = useTheme();
  const navigation = useNavigation<any>();

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

  const snapPoints = useMemo(() => ['55%', '90%'], []);
  const playCount = useSelector(selectAlbumPlayCount(album?.id ?? ''));
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { albumWithSongs, songs, songsLoading } = useLazyAlbumDetail(album, isSheetOpen);


  const sheetBg = { backgroundColor: isDarkMode ? colors.card : colors.background };
  const genreChipBg = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  const close = () => {
    (ref as any)?.current?.dismiss();
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
    navigation.navigate('(home)', { screen: 'albumView', params: { id: album.id } });
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
          <MediaImage cover={album.cover} size="grid" style={styles.cover} />
          <View style={styles.headerText}>
            <Text
              style={[styles.title, { color: colors.secondary }]}
              numberOfLines={2}
            >
              {album.title}
            </Text>
            <Text
              style={[styles.artist, { color: colors.subtext }]}
              numberOfLines={1}
            >
              {album.artist?.name ?? ''}
            </Text>
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
          <Text style={[styles.optionText, { color: colors.secondary }]}>{t('albumOptions.actions.play')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, playbackDisabled && styles.optionDisabled]}
          onPress={() => handlePlay(true)}
          disabled={playbackDisabled}
        >
          <Shuffle size={26} color={colors.secondary} />
          <Text style={[styles.optionText, { color: colors.secondary }]}>{t('albumOptions.actions.shuffle')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, playbackDisabled && styles.optionDisabled]}
          onPress={handleAddToNext}
          disabled={playbackDisabled}
        >
          <ListStart size={26} color={colors.secondary} />
          <Text style={[styles.optionText, { color: colors.secondary }]}>{t('albumOptions.actions.addToNext')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, playbackDisabled && styles.optionDisabled]}
          onPress={handleAddToEnd}
          disabled={playbackDisabled}
        >
          <ListEnd size={26} color={colors.secondary} />
          <Text style={[styles.optionText, { color: colors.secondary }]}>{t('albumOptions.actions.addToEnd')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.option, playbackDisabled && styles.optionDisabled]}
          onPress={handleShuffleToQueue}
          disabled={playbackDisabled}
        >
          <Shuffle size={26} color={colors.secondary} />
          <Text style={[styles.optionText, { color: colors.secondary }]}>{t('albumOptions.actions.shuffleToQueue')}</Text>
        </TouchableOpacity>

        {!hideGoToAlbum && (
          <TouchableOpacity style={styles.option} onPress={handleGoToAlbum}>
            <Disc size={26} color={colors.secondary} />
            <Text style={[styles.optionText, { color: colors.secondary }]}>{t('albumOptions.actions.goToAlbum')}</Text>
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
            {isDownloading ? t('albumOptions.actions.downloading') : isDownloaded ? t('albumOptions.actions.downloaded') : t('albumOptions.actions.download')}
          </Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.sectionLabel, { color: colors.subtext }]}>{t('albumOptions.sections.albumInfo')}</Text>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('albumOptions.info.artist')}</Text>
          <Text style={[styles.infoValue, { color: colors.secondary }]} numberOfLines={1}>
            {album.artist?.name ?? t('albumOptions.info.unknown')}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('albumOptions.info.year')}</Text>
          <Text style={[styles.infoValue, { color: colors.secondary }]}>{album.year ?? t('albumOptions.info.unknown')}</Text>
        </View>
        {album.genres?.length ? (
          <View style={styles.genreRow}>
            <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('albumOptions.info.genres')}</Text>
            <View style={styles.genreList}>
              {album.genres.map((g, i) => (
                <View key={`${g}-${i}`} style={[styles.genreChip, { backgroundColor: genreChipBg }]}>
                  <Text style={[styles.genreChipText, { color: colors.secondary }]}>{g}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('albumOptions.info.genres')}</Text>
            <Text style={[styles.infoValue, { color: colors.secondary }]}>{t('albumOptions.info.unknown')}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('albumOptions.info.songs')}</Text>
          <Text style={[styles.infoValue, { color: colors.secondary }]}>{songs.length}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('albumOptions.info.plays')}</Text>
          <Text style={[styles.infoValue, { color: colors.secondary }]}>{playCount}</Text>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
    </>
  );
});

AlbumOptions.displayName = 'AlbumOptions';

export default AlbumOptions;

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
  genreRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  genreList: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 12,
    justifyContent: 'flex-end',
    alignContent: 'flex-end',
  },
  genreChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  genreChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
