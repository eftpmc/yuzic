import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import {
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { CloudDownload, Ellipsis, Link, ChevronRight } from 'lucide-react-native';

import { useAnyDownloaderConnected } from '@/features/downloaders/registry';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { useExternalAlbumStatus } from '@/hooks/useExternalAlbumStatus';
import DownloadSheet from '@/components/options/DownloadSheet';
import type { ExternalAlbumBase } from '@/types';
import { useSheetRef } from '@/utils/useSheetRef';
import {
  OptionSheetDivider,
  OptionSheetHeader,
  OptionSheetRow,
  optionSheetStyles,
  useOptionSheetBackground,
} from './OptionSheetPrimitives';
import { spacing, statusColor } from '@/constants/design';
import Touchable from '@/components/Touchable';

interface ExternalAlbumOptionsProps {
  album: ExternalAlbumBase;
}

const ExternalAlbumOptions: React.FC<ExternalAlbumOptionsProps> = ({ album }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const bottomSheetRef = useSheetRef();
  const downloadSheetRef = useSheetRef();
  const snapPoints = useMemo(() => ['30%'], []);

  const status = useExternalAlbumStatus(album);

  const canDownload = useAnyDownloaderConnected();
  const sheetBg = useOptionSheetBackground();

  return (
    <>
      <Touchable
        style={styles.moreButton}
        onPress={() => bottomSheetRef.current?.present()}
      >
        <Ellipsis size={24} color={colors.secondary} />
      </Touchable>

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        backgroundStyle={[optionSheetStyles.sheetBackground, sheetBg]}
      >
        <BottomSheetView style={[optionSheetStyles.sheetContent, sheetBg]}>
          <OptionSheetHeader cover={album.cover} title={album.title} subtitle={album.artist} />

          <OptionSheetDivider />

          {status.kind === 'in_library' ? (
            <OptionSheetRow
              icon={<Link size={26} color={statusColor.success} />}
              label={t('externalAlbum.menu.inLibrary')}
            />
          ) : status.kind === 'downloading' ? (
            <OptionSheetRow
              icon={<SpinningLoaderCircle size={26} color={statusColor.downloading} />}
              label={t('externalAlbum.menu.downloading', { progress: status.progress })}
            />
          ) : canDownload ? (
            <OptionSheetRow
              icon={<CloudDownload size={26} color={colors.secondary} />}
              label={t('externalAlbum.menu.downloadToServer')}
              onPress={() => downloadSheetRef.current?.present()}
              trailing={<ChevronRight size={16} color={colors.placeholder} style={styles.chevron} />}
            />
          ) : (
            <OptionSheetRow
              icon={<CloudDownload size={26} color={colors.muted} />}
              label={t('externalAlbum.menu.noServiceConnected')}
              labelColor={colors.muted}
            />
          )}
        </BottomSheetView>
      </BottomSheetModal>

      <DownloadSheet album={album} sheetRef={downloadSheetRef} />
    </>
  );
};

export default ExternalAlbumOptions;

const styles = StyleSheet.create({
  moreButton: {
    padding: spacing.sm,
  },
  chevron: { marginLeft: spacing.xs },
});
