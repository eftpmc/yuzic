import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { CloudDownload, Download, Ellipsis, Play, ChevronRight } from 'lucide-react-native';

import {
  useAnyDownloaderConnected,
  useAnyTrackDownloaderConnected,
} from '@/features/downloaders/registry';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import DownloadSheet from '@/components/options/DownloadSheet';
import { ExternalSong } from '@/types';
import type { ExternalAlbumBase } from '@/types';
import { useSheetRef } from '@/utils/useSheetRef';
import { formatSongDuration } from '@/utils/formatDuration';
import {
  OptionSheetDivider,
  OptionSheetHeader,
  OptionSheetInfoRow,
  OptionSheetRow,
  OptionSheetSectionLabel,
  optionSheetStyles,
  useOptionSheetBackground,
} from './OptionSheetPrimitives';
import Touchable from '@/components/Touchable';
import { hitSlopFor, iconSize, spacing } from '@/constants/design';

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
  const { colors } = useTheme();

  const bottomSheetRef = useSheetRef();
  const downloadSheetRef = useSheetRef();
  const trackDownloadSheetRef = useSheetRef();
  const snapPoints = useMemo(() => ['40%', '70%'], []);

  const canDownload = useAnyDownloaderConnected();
  const canDownloadTrack = useAnyTrackDownloaderConnected();

  const sheetBg = useOptionSheetBackground();

  const albumBase = useMemo<ExternalAlbumBase>(() => ({
    id: song.albumId,
    title: albumTitle,
    artist: albumArtist,
    cover: song.cover,
    subtext: albumArtist,
  }), [song.albumId, song.cover, albumTitle, albumArtist]);

  const track = useMemo(() => ({
    title: song.title,
    artist: song.artist || albumArtist,
  }), [song.title, song.artist, albumArtist]);

  return (
    <>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={t('a11y.common.moreOptions')}
        onPress={() => bottomSheetRef.current?.present()}
        {...hitSlopFor(18)}
      >
        <Ellipsis size={iconSize.row} color={colors.secondary} />
      </Touchable>

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        backgroundStyle={[optionSheetStyles.sheetBackground, sheetBg]}
        stackBehavior="push"
      >
        <BottomSheetScrollView
          style={sheetBg}
          contentContainerStyle={optionSheetStyles.sheetContent}
        >
          <OptionSheetHeader
            cover={song.cover}
            title={song.title}
            subtitle={`${albumArtist} — ${albumTitle}`}
          />

          <OptionSheetDivider />

          {onPlay && (
            <OptionSheetRow
              icon={<Play size={iconSize.loader} color={colors.secondary} fill={colors.secondary} />}
              label={t('songOptions.actions.play')}
              onPress={() => {
                bottomSheetRef.current?.dismiss();
                onPlay();
              }}
            />
          )}

          {canDownloadTrack && (
            <OptionSheetRow
              icon={<Download size={iconSize.loader} color={colors.secondary} />}
              label={t('externalAlbum.menu.downloadSong')}
              onPress={() => trackDownloadSheetRef.current?.present()}
              trailing={<ChevronRight size={iconSize.inline} color={colors.placeholder} style={styles.chevron} />}
            />
          )}

          {canDownload && (
            <OptionSheetRow
              icon={<CloudDownload size={iconSize.loader} color={colors.secondary} />}
              label={t('externalAlbum.menu.downloadToServer')}
              onPress={() => downloadSheetRef.current?.present()}
              trailing={<ChevronRight size={iconSize.inline} color={colors.placeholder} style={styles.chevron} />}
            />
          )}

          {(!!onPlay || canDownload) && <OptionSheetDivider />}

          <OptionSheetSectionLabel label={t('songOptions.sections.media')} />
          <OptionSheetInfoRow
            label={t('songOptions.media.duration')}
            value={formatSongDuration(song.duration)}
          />
        </BottomSheetScrollView>
      </BottomSheetModal>

      <DownloadSheet album={albumBase} sheetRef={downloadSheetRef} />
      <DownloadSheet album={albumBase} track={track} sheetRef={trackDownloadSheetRef} />
    </>
  );
};

export default ExternalSongOptions;

const styles = StyleSheet.create({
  chevron: { marginLeft: spacing.xs },
});
