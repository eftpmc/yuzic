import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import {
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { CloudDownload, Ellipsis, Link, ChevronRight } from 'lucide-react-native';
import { useSelector } from 'react-redux';

import {
  selectLidarrAuthenticated,
  selectSlskdAuthenticated,
} from '@/utils/redux/selectors/downloadersSelectors';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { useExternalAlbumStatus } from '@/hooks/useExternalAlbumStatus';
import { MediaImage } from '@/components/MediaImage';
import DownloadAlbumSheet from '@/components/options/DownloadAlbumSheet';
import type { ExternalAlbumBase } from '@/types';
import { useSheetRef } from '@/utils/useSheetRef';

interface ExternalAlbumOptionsProps {
  album: ExternalAlbumBase;
}

const ExternalAlbumOptions: React.FC<ExternalAlbumOptionsProps> = ({ album }) => {
  const { t } = useTranslation();
  const { isDarkMode, colors } = useTheme();

  const bottomSheetRef = useSheetRef();
  const downloadSheetRef = useSheetRef();
  const snapPoints = useMemo(() => ['30%'], []);

  const status = useExternalAlbumStatus(album);

  const isLidarrConnected = useSelector(selectLidarrAuthenticated);
  const isSlskdConnected = useSelector(selectSlskdAuthenticated);

  const canDownload = isLidarrConnected || isSlskdConnected;
  const sheetBg = { backgroundColor: isDarkMode ? colors.card : colors.background };

  return (
    <>
      <TouchableOpacity
        style={styles.moreButton}
        onPress={() => bottomSheetRef.current?.present()}
      >
        <Ellipsis size={24} color={colors.secondary} />
      </TouchableOpacity>

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        backgroundStyle={[styles.sheetBackground, sheetBg]}
      >
        <BottomSheetView style={[styles.sheetContent, sheetBg]}>
          <View style={styles.header}>
            <MediaImage cover={album.cover} size="grid" style={styles.cover} />
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={1}>
                {album.title}
              </Text>
              <Text style={[styles.artist, { color: colors.subtext }]} numberOfLines={1}>
                {album.artist}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {status.kind === 'in_library' ? (
            <View style={styles.option}>
              <Link size={26} color="#34C759" />
              <Text style={[styles.optionText, { color: colors.secondary }]}>
                {t('externalAlbum.menu.inLibrary')}
              </Text>
            </View>
          ) : status.kind === 'downloading' ? (
            <View style={styles.option}>
              <SpinningLoaderCircle size={26} color="#007AFF" />
              <Text style={[styles.optionText, { color: colors.secondary }]}>
                {t('externalAlbum.menu.downloading', { progress: status.progress })}
              </Text>
            </View>
          ) : canDownload ? (
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
          ) : (
            <View style={styles.option}>
              <CloudDownload size={26} color={colors.muted} />
              <Text style={[styles.optionText, styles.disabledText]}>
                {t('externalAlbum.menu.noServiceConnected')}
              </Text>
            </View>
          )}
        </BottomSheetView>
      </BottomSheetModal>

      <DownloadAlbumSheet album={album} sheetRef={downloadSheetRef} />
    </>
  );
};

export default ExternalAlbumOptions;

const styles = StyleSheet.create({
  moreButton: {
    padding: 8,
  },
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
  disabledText: { color: '#888', fontSize: 14 },
  chevron: { marginLeft: 4 },
});
