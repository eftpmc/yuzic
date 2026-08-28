import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { toast } from '@backpackapp-io/react-native-toast';

import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import {
  useDownloaderStates,
  type DownloaderId,
  type DownloaderState,
} from '@/features/downloaders/registry';
import type { ExternalAlbumBase } from '@/types';
import {
  OptionSheetDivider,
  OptionSheetHeader,
  OptionSheetRow,
  OptionSheetSectionLabel,
  optionSheetStyles,
  useOptionSheetBackground,
} from './OptionSheetPrimitives';

interface Props {
  album: ExternalAlbumBase;
  /** When set, the sheet downloads this single track instead of the whole album. */
  track?: { title: string; artist: string };
  sheetRef: React.RefObject<BottomSheetModal>;
}

const DownloadSheet: React.FC<Props> = ({ album, track, sheetRef }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const downloaders = useDownloaderStates();
  const available = downloaders.filter(
    (d) => d.isConnected && (!track || !!d.def.downloadTrack)
  );

  const [loadingId, setLoadingId] = useState<DownloaderId | null>(null);
  const anyLoading = loadingId !== null;

  const sheetBg = useOptionSheetBackground();

  const handleDownload = async ({ def, config }: DownloaderState) => {
    if (anyLoading) return;
    setLoadingId(def.id);
    try {
      const result = track
        ? await def.downloadTrack!(config, { title: track.title, artist: track.artist })
        : await def.downloadAlbum(config, album);
      const successKey = track ? def.trackAddedKey! : def.albumAddedKey;
      toast[result.success ? 'success' : 'error'](
        result.success
          ? t(successKey)
          : (result.message ?? t('externalAlbum.download.failed'))
      );
      if (result.success) sheetRef.current?.dismiss();
    } catch {
      toast.error(t('externalAlbum.download.startFailed'));
    } finally {
      setLoadingId(null);
    }
  };

  const headerTitle = track ? track.title : album.title;
  const headerSubtext = track ? track.artist : album.artist;

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose={!anyLoading}
      backdropComponent={renderBackdrop}
      stackBehavior="push"
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      backgroundStyle={[optionSheetStyles.sheetBackground, sheetBg]}
    >
      <BottomSheetScrollView style={sheetBg} contentContainerStyle={styles.content}>
        <OptionSheetHeader cover={album.cover} title={headerTitle} subtitle={headerSubtext} />

        <OptionSheetDivider />

        <OptionSheetSectionLabel label={t('externalAlbum.download.chooseService')} />

        {available.map((downloader) => (
          <OptionSheetRow
            key={downloader.def.id}
            label={downloader.def.label}
            description={t(downloader.def.descriptionKey)}
            onPress={() => handleDownload(downloader)}
            disabled={anyLoading}
            dimRow={anyLoading}
            trailing={
              loadingId === downloader.def.id
                ? <SpinningLoaderCircle size={18} color={colors.subtext} />
                : null
            }
          />
        ))}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};

export default DownloadSheet;

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 48,
  },
});
