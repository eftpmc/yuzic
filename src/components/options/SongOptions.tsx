import React, { forwardRef, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Heart, CirclePlus, Disc, Radio } from 'lucide-react-native';

import { Song } from '@/types';
import { usePlayingState, usePlayingActions } from '@/contexts/PlayingContext';
import { useSelector } from 'react-redux';
import { selectSongPlayCount } from '@/utils/redux/selectors/statsSelectors';
import { MediaImage } from '@/components/MediaImage';
import { toast } from '@backpackapp-io/react-native-toast';
import { useTheme } from '@/hooks/useTheme';
import { ListEnd, ListStart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useStarredSongs, useStarSong, useUnstarSong } from '@/hooks/starred';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { useIsOffline } from '@/hooks/useIsOffline';
import { formatSongDuration } from '@/utils/formatDuration';

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
    const { isDarkMode, colors } = useTheme();
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

    const sheetBg = { backgroundColor: isDarkMode ? colors.card : colors.background };

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

    const genreChipBg = isDarkMode
      ? 'rgba(255,255,255,0.12)'
      : 'rgba(0,0,0,0.08)';

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        backgroundStyle={[styles.sheetBackground, sheetBg]}
        stackBehavior='push'
      >
        <BottomSheetScrollView
          style={sheetBg}
          contentContainerStyle={styles.sheetContent}
        >
          <View style={styles.header}>
            <MediaImage
              cover={selectedSong.cover}
              size="grid"
              style={styles.cover}
            />
            <View style={styles.headerText}>
              <Text
                style={[styles.title, { color: colors.secondary }]}
                numberOfLines={1}
              >
                {selectedSong.title}
              </Text>
              <Text
                style={[styles.artist, { color: colors.subtext }]}
                numberOfLines={1}
              >
                {selectedSong.artist || t('songOptions.unknownArtist')}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.option}
            onPress={toggleFavorite}
          >
            <Heart size={26} color="#ff3b30" fill={isStarred ? '#ff3b30' : 'none'} />
            <Text style={[styles.optionText, { color: colors.secondary }]}>
              {isStarred ? t('songOptions.actions.unfavorite') : t('songOptions.actions.favorite')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={handleAddToQueue}
          >
            <ListStart size={26} color={colors.secondary} />
            <Text style={[styles.optionText, { color: colors.secondary }]}>
              {t('songOptions.actions.addToQueue')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={handleAddToEndQueue}
          >
            <ListEnd size={26} color={colors.secondary} />
            <Text style={[styles.optionText, { color: colors.secondary }]}>
              {t('songOptions.actions.addToEnd')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={handleAddToPlaylist}
          >
            <CirclePlus size={26} color={colors.secondary} />
            <Text style={[styles.optionText, { color: colors.secondary }]}>
              {t('songOptions.actions.addToPlaylist')}
            </Text>
          </TouchableOpacity>

          {selectedSong.albumId && (
            <TouchableOpacity
              style={styles.option}
              onPress={handleGoToAlbum}
            >
              <Disc size={26} color={colors.secondary} />
              <Text style={[styles.optionText, { color: colors.secondary }]}>
                {t('songOptions.actions.goToAlbum')}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.option}
            onPress={handleInstantMix}
          >
            <Radio size={26} color={colors.secondary} />
            <Text style={[styles.optionText, { color: colors.secondary }]}>
              {t('songOptions.actions.instantMix')}
            </Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.sectionLabel, { color: colors.subtext }]}>{t('songOptions.sections.media')}</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('songOptions.media.duration')}</Text>
            <Text style={[styles.infoValue, { color: colors.secondary }]}>
              {formatSongDuration(selectedSong.duration)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('songOptions.media.plays')}</Text>
            <Text style={[styles.infoValue, { color: colors.secondary }]}>{playCount}</Text>
          </View>
          {selectedSong.bitrate != null && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('songOptions.media.bitrate')}</Text>
              <Text style={[styles.infoValue, { color: colors.secondary }]}>{t('songOptions.media.kbps', { value: selectedSong.bitrate })}</Text>
            </View>
          )}
          {selectedSong.sampleRate != null && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('songOptions.media.sampleRate')}</Text>
              <Text style={[styles.infoValue, { color: colors.secondary }]}>{t('songOptions.media.hz', { value: selectedSong.sampleRate })}</Text>
            </View>
          )}
          {selectedSong.bitsPerSample != null && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('songOptions.media.bitsPerSample')}</Text>
              <Text style={[styles.infoValue, { color: colors.secondary }]}>{selectedSong.bitsPerSample}</Text>
            </View>
          )}
          {selectedSong.mimeType && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('songOptions.media.format')}</Text>
              <Text style={[styles.infoValue, { color: colors.secondary }]} numberOfLines={1}>{selectedSong.mimeType}</Text>
            </View>
          )}

          {(selectedSong.disc != null || selectedSong.trackNumber != null) && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.subtext }, styles.sectionLabelSpaced]}>{t('songOptions.sections.track')}</Text>
              {selectedSong.disc != null && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('songOptions.track.disc')}</Text>
                  <Text style={[styles.infoValue, { color: colors.secondary }]}>{selectedSong.disc}</Text>
                </View>
              )}
              {selectedSong.trackNumber != null && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('songOptions.track.track')}</Text>
                  <Text style={[styles.infoValue, { color: colors.secondary }]}>{selectedSong.trackNumber}</Text>
                </View>
              )}
            </>
          )}

          {(selectedSong.dateReleased || selectedSong.dateAdded) && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.subtext }, styles.sectionLabelSpaced]}>{t('songOptions.sections.dates')}</Text>
              {selectedSong.dateReleased && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('songOptions.dates.released')}</Text>
                  <Text style={[styles.infoValue, { color: colors.secondary }]}>{formatDate(selectedSong.dateReleased)}</Text>
                </View>
              )}
              {selectedSong.dateAdded && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('songOptions.dates.added')}</Text>
                  <Text style={[styles.infoValue, { color: colors.secondary }]} numberOfLines={1}>{formatDate(selectedSong.dateAdded)}</Text>
                </View>
              )}
            </>
          )}

          {(selectedSong.bpm != null || selectedSong.genres?.length || selectedSong.filePath) && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.subtext }, styles.sectionLabelSpaced]}>{t('songOptions.sections.other')}</Text>
              {selectedSong.bpm != null && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('songOptions.other.bpm')}</Text>
                  <Text style={[styles.infoValue, { color: colors.secondary }]}>{selectedSong.bpm}</Text>
                </View>
              )}
              {selectedSong.genres?.length ? (
                <View style={styles.genreRow}>
                  <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('songOptions.other.genres')}</Text>
                  <View style={styles.genreList}>
                    {selectedSong.genres.map((g, i) => (
                      <View key={`${g}-${i}`} style={[styles.genreChip, { backgroundColor: genreChipBg }]}>
                        <Text style={[styles.genreChipText, { color: colors.secondary }]}>{g}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
              {selectedSong.filePath ? (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('songOptions.other.filePath')}</Text>
                  <Text style={[styles.infoValue, { color: colors.secondary }]} numberOfLines={2}>
                    {selectedSong.filePath}
                  </Text>
                </View>
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

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetContent: {
    padding: 16,
    paddingBottom: 32,
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
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  artist: {
    fontSize: 14,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  optionText: {
    marginLeft: 16,
    fontSize: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  sectionLabelSpaced: {
    marginTop: 16,
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
