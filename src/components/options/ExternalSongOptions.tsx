import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import {
  selectLidarrAuthenticated,
  selectSlskdAuthenticated,
} from '@/utils/redux/selectors/downloadersSelectors';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { MediaImage } from '@/components/MediaImage';
import DownloadAlbumSheet from '@/components/options/DownloadAlbumSheet';
import { ExternalSong } from '@/types';
import type { ExternalAlbumBase } from '@/types';

function formatDuration(seconds: string): string {
  const n = parseInt(seconds, 10);
  if (isNaN(n)) return seconds;
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface ExternalSongOptionsProps {
  song: ExternalSong;
  albumTitle: string;
  albumArtist: string;
}

const ExternalSongOptions: React.FC<ExternalSongOptionsProps> = ({
  song,
  albumTitle,
  albumArtist,
}) => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const themeStyles = isDarkMode ? stylesDark : stylesLight;

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const downloadSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['40%', '70%'], []);

  const isLidarrConnected = useSelector(selectLidarrAuthenticated);
  const isSlskdConnected = useSelector(selectSlskdAuthenticated);
  const canDownload = isLidarrConnected || isSlskdConnected;

  const albumBase = useMemo<ExternalAlbumBase>(() => ({
    id: song.albumId,
    title: albumTitle,
    artist: albumArtist,
    cover: song.cover,
    subtext: albumArtist,
  }), [song.albumId, song.cover, albumTitle, albumArtist]);

  return (
    <>
      <TouchableOpacity
        onPress={() => bottomSheetRef.current?.present()}
        hitSlop={10}
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={18}
          color={isDarkMode ? '#fff' : '#000'}
        />
      </TouchableOpacity>

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: isDarkMode ? '#555' : '#ccc' }}
        backgroundStyle={[styles.sheetBackground, themeStyles.sheetBackground]}
        stackBehavior="push"
      >
        <BottomSheetScrollView
          style={themeStyles.sheetBackground}
          contentContainerStyle={styles.sheetContent}
        >
          <View style={styles.header}>
            <MediaImage cover={song.cover} size="grid" style={styles.cover} />
            <View style={styles.headerText}>
              <Text style={[styles.title, themeStyles.title]} numberOfLines={1}>
                {song.title}
              </Text>
              <Text style={[styles.artist, themeStyles.artist]} numberOfLines={1}>
                {albumArtist} — {albumTitle}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {canDownload && (
            <TouchableOpacity
              style={styles.option}
              onPress={() => downloadSheetRef.current?.present()}
            >
              <Ionicons name="arrow-down-circle" size={26} color={themeStyles.icon.color} />
              <Text style={[styles.optionText, themeStyles.optionText]}>
                {t('externalAlbum.menu.downloadToServer')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#555' : '#bbb'} style={styles.chevron} />
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          <Text style={[styles.sectionLabel, themeStyles.artist]}>{t('songOptions.sections.media')}</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, themeStyles.artist]}>{t('songOptions.media.duration')}</Text>
            <Text style={[styles.infoValue, themeStyles.title]}>
              {formatDuration(song.duration)}
            </Text>
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

      <DownloadAlbumSheet album={albumBase} sheetRef={downloadSheetRef} />
    </>
  );
};

export default ExternalSongOptions;

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
  headerText: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600' },
  artist: { fontSize: 14, marginTop: 2 },
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
  optionText: { marginLeft: 16, fontSize: 16, flex: 1 },
  chevron: { marginLeft: 4 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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

const stylesLight = StyleSheet.create({
  sheetBackground: { backgroundColor: '#F2F2F7' },
  title: { color: '#000' },
  artist: { color: '#666' },
  optionText: { color: '#000' },
  icon: { color: '#000' },
});

const stylesDark = StyleSheet.create({
  sheetBackground: { backgroundColor: '#222' },
  title: { color: '#fff' },
  artist: { color: '#aaa' },
  optionText: { color: '#fff' },
  icon: { color: '#999' },
});
