import React, { useMemo } from 'react';
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
import { CloudDownload, Ellipsis, Play, ChevronRight } from 'lucide-react-native';
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
import { useSheetRef } from '@/utils/useSheetRef';
import { formatSongDuration } from '@/utils/formatDuration';

interface ExternalSongOptionsProps {
  song: ExternalSong;
  albumTitle: string;
  albumArtist: string;
  onPlay?: () => void;
}

const ExternalSongOptions: React.FC<ExternalSongOptionsProps> = ({
  song,
  albumTitle,
  albumArtist,
  onPlay,
}) => {
  const { t } = useTranslation();
  const { isDarkMode, colors } = useTheme();

  const bottomSheetRef = useSheetRef();
  const downloadSheetRef = useSheetRef();
  const snapPoints = useMemo(() => ['40%', '70%'], []);

  const isLidarrConnected = useSelector(selectLidarrAuthenticated);
  const isSlskdConnected = useSelector(selectSlskdAuthenticated);
  const canDownload = isLidarrConnected || isSlskdConnected;

  const sheetBg = { backgroundColor: isDarkMode ? colors.card : colors.background };

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
        <Ellipsis size={18} color={colors.secondary} />
      </TouchableOpacity>

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        backgroundStyle={[styles.sheetBackground, sheetBg]}
        stackBehavior="push"
      >
        <BottomSheetScrollView
          style={sheetBg}
          contentContainerStyle={styles.sheetContent}
        >
          <View style={styles.header}>
            <MediaImage cover={song.cover} size="grid" style={styles.cover} />
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={1}>
                {song.title}
              </Text>
              <Text style={[styles.artist, { color: colors.subtext }]} numberOfLines={1}>
                {albumArtist} — {albumTitle}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {onPlay && (
            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                bottomSheetRef.current?.dismiss();
                onPlay();
              }}
            >
              <Play size={26} color={colors.secondary} fill={colors.secondary} />
              <Text style={[styles.optionText, { color: colors.secondary }]}>
                {t('songOptions.actions.play')}
              </Text>
            </TouchableOpacity>
          )}

          {canDownload && (
            <TouchableOpacity
              style={styles.option}
              onPress={() => downloadSheetRef.current?.present()}
            >
              <CloudDownload size={26} color={colors.secondary} />
              <Text style={[styles.optionText, { color: colors.secondary }]}>
                {t('externalAlbum.menu.downloadToServer')}
              </Text>
              <ChevronRight size={16} color={colors.placeholder} style={styles.chevron} />
            </TouchableOpacity>
          )}

          {(!!onPlay || canDownload) && <View style={[styles.divider, { backgroundColor: colors.border }]} />}

          <Text style={[styles.sectionLabel, { color: colors.subtext }]}>{t('songOptions.sections.media')}</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.subtext }]}>{t('songOptions.media.duration')}</Text>
            <Text style={[styles.infoValue, { color: colors.secondary }]}>
              {formatSongDuration(song.duration)}
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
  optionText: { marginLeft: 16, fontSize: 16, fontWeight: '500', flex: 1 },
  chevron: { marginLeft: 4 },
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
