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
import { Ionicons } from '@expo/vector-icons';

import { Song } from '@/types';
import { usePlaying } from '@/contexts/PlayingContext';
import { MediaImage } from '@/components/MediaImage';
import { toast } from '@backpackapp-io/react-native-toast';
import { useTheme } from '@/hooks/useTheme';
import { ListEnd, ListStart, PlusCircle, Radio } from 'lucide-react-native';
import { useStarredSongs, useStarSong, useUnstarSong } from '@/hooks/starred';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';

type SongOptionsProps = {
  selectedSong: Song;
  onAddToPlaylist: () => void;
};

function formatDuration(seconds: string): string {
  const n = parseInt(seconds, 10);
  if (isNaN(n)) return seconds;
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

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
  React.ElementRef<typeof BottomSheetModal>,
  SongOptionsProps
>(({ selectedSong, onAddToPlaylist }, ref) => {
    const { t } = useTranslation();
    const { isDarkMode } = useTheme();
    const themeStyles = isDarkMode ? stylesDark : stylesLight;

    const snapPoints = useMemo(() => ['55%', '90%'], []);

    const { currentSong, addToQueue, playNext, playSimilar } = usePlaying();
    const instantMixInFlightRef = useRef(false);

    const { songs: starredSongs } = useStarredSongs();
    const starSong = useStarSong();
    const unstarSong = useUnstarSong();

    const isStarred = starredSongs.some(
      s => s.id === selectedSong.id
    );

    const close = () => {
      (ref as any)?.current?.dismiss();
    };

    const toggleFavorite = async () => {
      try {
        if (isStarred) {
          await unstarSong.mutateAsync(selectedSong.id);
          toast.success(t('songOptions.toasts.removedFromFavorites', { title: selectedSong.title }));
        } else {
          await starSong.mutateAsync(selectedSong.id);
          toast.success(t('songOptions.toasts.addedToFavorites', { title: selectedSong.title }));
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
        handleIndicatorStyle={{
          backgroundColor: isDarkMode ? '#555' : '#ccc',
        }}
        backgroundStyle={[
          styles.sheetBackground,
          themeStyles.sheetBackground,
        ]}
        stackBehavior='push'
      >
        <BottomSheetScrollView
          style={themeStyles.sheetBackground}
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
                style={[styles.title, themeStyles.title]}
                numberOfLines={1}
              >
                {selectedSong.title}
              </Text>
              <Text
                style={[styles.artist, themeStyles.artist]}
                numberOfLines={1}
              >
                {selectedSong.artist || t('songOptions.unknownArtist')}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.option}
            onPress={toggleFavorite}
          >
            <Ionicons
              name={isStarred ? 'heart' : 'heart-outline'}
              size={26}
              color="#ff3b30"
            />
            <Text
              style={[styles.optionText, themeStyles.optionText]}
            >
              {isStarred ? t('songOptions.actions.unfavorite') : t('songOptions.actions.favorite')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={handleAddToQueue}
          >
            <ListStart
              size={26}
              color={themeStyles.icon.color}
            />
            <Text
              style={[styles.optionText, themeStyles.optionText]}
            >
              {t('songOptions.actions.addToQueue')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={handleAddToEndQueue}
          >
            <ListEnd
              size={26}
              color={themeStyles.icon.color}
            />
            <Text
              style={[styles.optionText, themeStyles.optionText]}
            >
              {t('songOptions.actions.addToEnd')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={handleAddToPlaylist}
          >
            <PlusCircle
              size={26}
              color={themeStyles.icon.color}
            />
            <Text
              style={[styles.optionText, themeStyles.optionText]}
            >
              {t('songOptions.actions.addToPlaylist')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={handleInstantMix}
          >
            <Radio
              size={26}
              color={themeStyles.icon.color}
            />
            <Text
              style={[styles.optionText, themeStyles.optionText]}
            >
              {t('songOptions.actions.instantMix')}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={[styles.sectionLabel, themeStyles.artist]}>{t('songOptions.sections.media')}</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, themeStyles.artist]}>{t('songOptions.media.duration')}</Text>
            <Text style={[styles.infoValue, themeStyles.title]}>
              {formatDuration(selectedSong.duration)}
            </Text>
          </View>
          {selectedSong.bitrate != null && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, themeStyles.artist]}>{t('songOptions.media.bitrate')}</Text>
              <Text style={[styles.infoValue, themeStyles.title]}>{t('songOptions.media.kbps', { value: selectedSong.bitrate })}</Text>
            </View>
          )}
          {selectedSong.sampleRate != null && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, themeStyles.artist]}>{t('songOptions.media.sampleRate')}</Text>
              <Text style={[styles.infoValue, themeStyles.title]}>{t('songOptions.media.hz', { value: selectedSong.sampleRate })}</Text>
            </View>
          )}
          {selectedSong.bitsPerSample != null && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, themeStyles.artist]}>{t('songOptions.media.bitsPerSample')}</Text>
              <Text style={[styles.infoValue, themeStyles.title]}>{selectedSong.bitsPerSample}</Text>
            </View>
          )}
          {selectedSong.mimeType && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, themeStyles.artist]}>{t('songOptions.media.format')}</Text>
              <Text style={[styles.infoValue, themeStyles.title]} numberOfLines={1}>{selectedSong.mimeType}</Text>
            </View>
          )}

          {(selectedSong.disc != null || selectedSong.trackNumber != null) && (
            <>
              <Text style={[styles.sectionLabel, themeStyles.artist, styles.sectionLabelSpaced]}>{t('songOptions.sections.track')}</Text>
              {selectedSong.disc != null && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, themeStyles.artist]}>{t('songOptions.track.disc')}</Text>
                  <Text style={[styles.infoValue, themeStyles.title]}>{selectedSong.disc}</Text>
                </View>
              )}
              {selectedSong.trackNumber != null && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, themeStyles.artist]}>{t('songOptions.track.track')}</Text>
                  <Text style={[styles.infoValue, themeStyles.title]}>{selectedSong.trackNumber}</Text>
                </View>
              )}
            </>
          )}

          {(selectedSong.dateReleased || selectedSong.dateAdded) && (
            <>
              <Text style={[styles.sectionLabel, themeStyles.artist, styles.sectionLabelSpaced]}>{t('songOptions.sections.dates')}</Text>
              {selectedSong.dateReleased && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, themeStyles.artist]}>{t('songOptions.dates.released')}</Text>
                  <Text style={[styles.infoValue, themeStyles.title]}>{formatDate(selectedSong.dateReleased)}</Text>
                </View>
              )}
              {selectedSong.dateAdded && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, themeStyles.artist]}>{t('songOptions.dates.added')}</Text>
                  <Text style={[styles.infoValue, themeStyles.title]} numberOfLines={1}>{formatDate(selectedSong.dateAdded)}</Text>
                </View>
              )}
            </>
          )}

          {(selectedSong.bpm != null || selectedSong.genres?.length || selectedSong.filePath) && (
            <>
              <Text style={[styles.sectionLabel, themeStyles.artist, styles.sectionLabelSpaced]}>{t('songOptions.sections.other')}</Text>
              {selectedSong.bpm != null && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, themeStyles.artist]}>{t('songOptions.other.bpm')}</Text>
                  <Text style={[styles.infoValue, themeStyles.title]}>{selectedSong.bpm}</Text>
                </View>
              )}
              {selectedSong.genres?.length ? (
                <View style={styles.genreRow}>
                  <Text style={[styles.infoLabel, themeStyles.artist]}>{t('songOptions.other.genres')}</Text>
                  <View style={styles.genreList}>
                    {selectedSong.genres.map((g, i) => (
                      <View key={`${g}-${i}`} style={[styles.genreChip, themeStyles.genreChip]}>
                        <Text style={[styles.genreChipText, themeStyles.title]}>{g}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
              {selectedSong.filePath ? (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, themeStyles.artist]}>{t('songOptions.other.filePath')}</Text>
                  <Text style={[styles.infoValue, themeStyles.title]} numberOfLines={2}>
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
    fontWeight: '600',
  },
  artist: {
    fontSize: 14,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#444',
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
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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

const stylesLight = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#F2F2F7',
  },
  title: {
    color: '#000',
  },
  artist: {
    color: '#666',
  },
  optionText: {
    color: '#000',
  },
  icon: {
    color: '#000',
  },
  genreChip: {
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
});

const stylesDark = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#222',
  },
  title: {
    color: '#fff',
  },
  artist: {
    color: '#aaa',
  },
  optionText: {
    color: '#fff',
  },
  icon: {
    color: '#999',
  },
  genreChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});