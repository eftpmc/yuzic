import React, { forwardRef, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Heart, CirclePlus, Disc, Radio, Mic2, ListEnd, ListStart, CheckCircle, ArrowDownCircle } from 'lucide-react-native';

import { Song } from '@/types';
import { usePlayingState, usePlayingActions } from '@/contexts/PlayingContext';
import { useSelector } from 'react-redux';
import { selectSongPlayCount } from '@/utils/redux/selectors/statsSelectors';
import { toast } from '@backpackapp-io/react-native-toast';
import { useTheme } from '@/hooks/useTheme';
import { useRouter } from 'expo-router';
import { useStarredSongs, useStarSong, useUnstarSong } from '@/hooks/starred';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { useIsOffline } from '@/hooks/useIsOffline';
import { formatSongDuration } from '@/utils/formatDuration';
import { useDownload } from '@/contexts/DownloadContext';
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
import { statusColor } from '@/constants/design';

type SongOptionsProps = {
  selectedSong: Song;
  onAddToPlaylist: () => void;
  onNavigate?: () => void;
};

function formatDate(value: string): string {
  if (!value) return value;
  if (/^\d{4}$/.test(value.trim())) return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const year = d.getFullYear();
  const month = d.toLocaleString('default', { month: 'short' });
  const day = d.getDate();
  return `${month} ${day}, ${year}`;
}

const SongOptions = forwardRef<
  BottomSheetModal,
  SongOptionsProps
>(({ selectedSong, onAddToPlaylist, onNavigate }, ref) => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const isOffline = useIsOffline();

    const snapPoints = useMemo(() => ['55%', '90%'], []);

    const router = useRouter();
    const { currentSong } = usePlayingState();
    const { addToQueue, playNext, playSimilar } = usePlayingActions();
    const instantMixInFlightRef = useRef(false);
    const playCount = useSelector(selectSongPlayCount(selectedSong.id));

    const { songs: starredSongs } = useStarredSongs();
    const starSong = useStarSong();
    const unstarSong = useUnstarSong();

    const isStarred = starredSongs.some(
      s => s.id === selectedSong.id
    );

    const { downloadTrack, deleteDownloadedTrack, isTrackDownloaded, isTrackDownloading } = useDownload();
    const isDownloaded = isTrackDownloaded(selectedSong.id);
    const isDownloading = isTrackDownloading(selectedSong.id);

    const sheetBg = useOptionSheetBackground();

    const close = () => {
      (ref as any)?.current?.dismiss();
    };

    const toggleFavorite = async () => {
      try {
        if (isStarred) {
          await unstarSong.mutateAsync(selectedSong.id);
          toast.success(t(
            isOffline
              ? 'songOptions.toasts.removedFromFavoritesOffline'
              : 'songOptions.toasts.removedFromFavorites',
            { title: selectedSong.title }
          ));
        } else {
          await starSong.mutateAsync(selectedSong);
          toast.success(t(
            isOffline
              ? 'songOptions.toasts.addedToFavoritesOffline'
              : 'songOptions.toasts.addedToFavorites',
            { title: selectedSong.title }
          ));
        }
      } catch {
        toast.error(t('songOptions.toasts.updateFavoritesFailed'));
      } finally {
        close();
      }
    };

    const confirmRemoveDownload = () => {
      Alert.alert(
        t('settings.library.downloads.removeTitle'),
        t('settings.library.downloads.removeBody', { title: selectedSong.title }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteDownloadedTrack(selectedSong.id);
              } catch {
                toast.error(t('settings.library.downloads.removeFailedBody'));
              }
            },
          },
        ]
      );
    };

    const handleDownload = async () => {
      if (isDownloading) return;
      if (isDownloaded) {
        confirmRemoveDownload();
        return;
      }
      try {
        await downloadTrack(selectedSong);
      } catch {
        toast.error(t('songOptions.toasts.downloadFailed', { title: selectedSong.title }));
      }
    };

    const handleAddToEndQueue = async () => {
      if (!currentSong) {
        toast.error(t('songOptions.toasts.nothingPlaying'));
        return;
      }

      if (selectedSong.id === currentSong.id) {
        toast.error(t('songOptions.toasts.alreadyPlaying', { title: selectedSong.title }));
        return;
      }

      try {
        await addToQueue(selectedSong);
        toast.success(t('songOptions.toasts.addedToQueue', { title: selectedSong.title }));
      } catch {
        toast.error(t('songOptions.toasts.addToQueueFailed'));
      } finally {
        close();
      }
    };

    const handleAddToQueue = async () => {
      if (!currentSong) {
        toast.error(t('songOptions.toasts.nothingPlaying'));
        return;
      }

      if (selectedSong.id === currentSong.id) {
        toast.error(t('songOptions.toasts.alreadyPlaying', { title: selectedSong.title }));
        return;
      }

      try {
        await playNext(selectedSong);
        toast.success(t('songOptions.toasts.playNext', { title: selectedSong.title }));
      } catch {
        toast.error(t('songOptions.toasts.playNextFailed'));
      } finally {
        close();
      }
    };

    const handleAddToPlaylist = () => {
      close();
      requestAnimationFrame(onAddToPlaylist);
    };

    const handleGoToAlbum = () => {
      close();
      onNavigate?.();
      router.push({ pathname: '/(home)/albumView', params: { id: selectedSong.albumId } });
    };

    const handleGoToArtist = () => {
      close();
      onNavigate?.();
      router.push({ pathname: '/(home)/artistView', params: { id: selectedSong.artistId } });
    };

    const handleInstantMix = async () => {
      if (instantMixInFlightRef.current) return;
      instantMixInFlightRef.current = true;
      try {
        await playSimilar(selectedSong);
      } catch {
        toast.error(t('songOptions.toasts.instantMixFailed'));
      } finally {
        instantMixInFlightRef.current = false;
        close();
      }
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        backgroundStyle={[optionSheetStyles.sheetBackground, sheetBg]}
        stackBehavior='push'
      >
        <BottomSheetScrollView
          testID="song-options-sheet"
          style={sheetBg}
          contentContainerStyle={optionSheetStyles.sheetContent}
        >
          <OptionSheetHeader
            cover={selectedSong.cover}
            title={selectedSong.title}
            subtitle={selectedSong.artist || t('songOptions.unknownArtist')}
          />

          <OptionSheetDivider />

          <OptionSheetRow
            icon={<Heart size={26} color={statusColor.favorite} fill={isStarred ? statusColor.favorite : 'none'} />}
            label={isStarred ? t('songOptions.actions.unfavorite') : t('songOptions.actions.favorite')}
            onPress={toggleFavorite}
          />

          <OptionSheetRow
            icon={<ListStart size={26} color={colors.secondary} />}
            label={t('songOptions.actions.addToQueue')}
            onPress={handleAddToQueue}
          />

          <OptionSheetRow
            icon={<ListEnd size={26} color={colors.secondary} />}
            label={t('songOptions.actions.addToEnd')}
            onPress={handleAddToEndQueue}
          />

          <OptionSheetRow
            icon={<CirclePlus size={26} color={colors.secondary} />}
            label={t('songOptions.actions.addToPlaylist')}
            onPress={handleAddToPlaylist}
          />

          <OptionSheetRow
            icon={
              isDownloaded ? (
                <CheckCircle size={26} color={colors.subtext} />
              ) : (
                <ArrowDownCircle size={26} color={colors.secondary} />
              )
            }
            label={isDownloading ? t('songOptions.actions.downloading') : isDownloaded ? t('songOptions.actions.downloaded') : t('songOptions.actions.download')}
            onPress={handleDownload}
            disabled={isDownloading}
            loading={isDownloading}
            dimLabel={isDownloaded || isDownloading}
          />

          {selectedSong.albumId && (
            <OptionSheetRow
              icon={<Disc size={26} color={colors.secondary} />}
              label={t('songOptions.actions.goToAlbum')}
              onPress={handleGoToAlbum}
            />
          )}

          {selectedSong.artistId && (
            <OptionSheetRow
              icon={<Mic2 size={26} color={colors.secondary} />}
              label={t('songOptions.actions.goToArtist')}
              onPress={handleGoToArtist}
            />
          )}

          <OptionSheetRow
            icon={<Radio size={26} color={colors.secondary} />}
            label={t('songOptions.actions.instantMix')}
            onPress={handleInstantMix}
          />

          <OptionSheetDivider />

          <OptionSheetSectionLabel label={t('songOptions.sections.media')} />
          <OptionSheetInfoRow
            label={t('songOptions.media.duration')}
            value={formatSongDuration(selectedSong.duration)}
          />
          <OptionSheetInfoRow label={t('songOptions.media.plays')} value={playCount} />
          {selectedSong.bitrate != null && (
            <OptionSheetInfoRow
              label={t('songOptions.media.bitrate')}
              value={t('songOptions.media.kbps', { value: selectedSong.bitrate })}
            />
          )}
          {selectedSong.sampleRate != null && (
            <OptionSheetInfoRow
              label={t('songOptions.media.sampleRate')}
              value={t('songOptions.media.hz', { value: selectedSong.sampleRate })}
            />
          )}
          {selectedSong.bitsPerSample != null && (
            <OptionSheetInfoRow
              label={t('songOptions.media.bitsPerSample')}
              value={selectedSong.bitsPerSample}
            />
          )}
          {selectedSong.mimeType && (
            <OptionSheetInfoRow
              label={t('songOptions.media.format')}
              value={selectedSong.mimeType}
              valueLines={1}
            />
          )}

          {(selectedSong.disc != null || selectedSong.trackNumber != null) && (
            <>
              <OptionSheetSectionLabel label={t('songOptions.sections.track')} spaced />
              {selectedSong.disc != null && (
                <OptionSheetInfoRow label={t('songOptions.track.disc')} value={selectedSong.disc} />
              )}
              {selectedSong.trackNumber != null && (
                <OptionSheetInfoRow label={t('songOptions.track.track')} value={selectedSong.trackNumber} />
              )}
            </>
          )}

          {(selectedSong.dateReleased || selectedSong.dateAdded) && (
            <>
              <OptionSheetSectionLabel label={t('songOptions.sections.dates')} spaced />
              {selectedSong.dateReleased && (
                <OptionSheetInfoRow
                  label={t('songOptions.dates.released')}
                  value={formatDate(selectedSong.dateReleased)}
                />
              )}
              {selectedSong.dateAdded && (
                <OptionSheetInfoRow
                  label={t('songOptions.dates.added')}
                  value={formatDate(selectedSong.dateAdded)}
                  valueLines={1}
                />
              )}
            </>
          )}

          {(selectedSong.bpm != null || selectedSong.genres?.length || selectedSong.filePath) && (
            <>
              <OptionSheetSectionLabel label={t('songOptions.sections.other')} spaced />
              {selectedSong.bpm != null && (
                <OptionSheetInfoRow label={t('songOptions.other.bpm')} value={selectedSong.bpm} />
              )}
              {selectedSong.genres?.length ? (
                <OptionSheetChipsRow label={t('songOptions.other.genres')} values={selectedSong.genres} />
              ) : null}
              {selectedSong.filePath ? (
                <OptionSheetInfoRow
                  label={t('songOptions.other.filePath')}
                  value={selectedSong.filePath}
                  valueLines={2}
                />
              ) : null}
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

SongOptions.displayName = 'SongOptions';

export default SongOptions;
