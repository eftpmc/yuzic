import React, { useRef, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { toast } from '@backpackapp-io/react-native-toast';

import * as lidarr from '@/api/lidarr';
import * as slskd from '@/api/slskd';
import {
  selectLidarrConfig,
  selectLidarrAuthenticated,
  selectIsLidarrActive,
  selectSlskdConfig,
  selectSlskdAuthenticated,
  selectIsSlskdActive,
} from '@/utils/redux/selectors/downloadersSelectors';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';

interface ExternalAlbumOptionsProps {
  selectedAlbumTitle: string;
  selectedAlbumArtist: string;
}

const ExternalAlbumOptions: React.FC<ExternalAlbumOptionsProps> = ({
  selectedAlbumTitle,
  selectedAlbumArtist,
}) => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const themeStyles = isDarkMode ? stylesDark : stylesLight;

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['25%'], []);
  const [downloading, setDownloading] = useState(false);

  const lidarrConfig = useSelector(selectLidarrConfig);
  const isLidarrConnected = useSelector(selectLidarrAuthenticated);
  const isLidarrActive = useSelector(selectIsLidarrActive);
  const slskdConfig = useSelector(selectSlskdConfig);
  const isSlskdConnected = useSelector(selectSlskdAuthenticated);
  const isSlskdActive = useSelector(selectIsSlskdActive);

  const canDownload =
    (isLidarrActive && isLidarrConnected) ||
    (isSlskdActive && isSlskdConnected);

  const close = () => {
    bottomSheetRef.current?.dismiss();
  };

  const handleDownloadAlbum = async () => {
    if (!selectedAlbumTitle || !selectedAlbumArtist || downloading) return;

    if (!canDownload) {
      toast.error(t('externalAlbum.download.noDownloader'));
      return;
    }

    setDownloading(true);
    try {
      if (isLidarrActive && isLidarrConnected) {
        const result = await lidarr.downloadAlbum(
          lidarrConfig,
          selectedAlbumTitle,
          selectedAlbumArtist
        );
        toast[result.success ? 'success' : 'error'](
          result.success
            ? t('externalAlbum.download.addedToLidarr')
            : (result.message ?? t('externalAlbum.download.failed'))
        );
        close();
        return;
      }

      if (isSlskdActive && isSlskdConnected) {
        const result = await slskd.downloadAlbum(
          slskdConfig,
          selectedAlbumTitle,
          selectedAlbumArtist
        );
        toast[result.success ? 'success' : 'error'](
          result.success
            ? t('externalAlbum.download.addedToSlskd')
            : (result.message ?? t('externalAlbum.download.failed'))
        );
        close();
        return;
      }

      toast.error(t('externalAlbum.download.noDownloader'));
    } catch (e) {
      toast.error(t('externalAlbum.download.startFailed'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.moreButton}
        onPress={() => {
          if (!canDownload) {
            toast.error(t('externalAlbum.download.noDownloader'));
            return;
          }
          bottomSheetRef.current?.present();
        }}
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={24}
          color={isDarkMode ? '#fff' : '#000'}
        />
      </TouchableOpacity>

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{
          backgroundColor: isDarkMode ? '#555' : '#ccc',
        }}
        backgroundStyle={[styles.sheetBackground, themeStyles.sheetBackground]}
      >
        <BottomSheetView style={[styles.sheetContent, themeStyles.sheetBackground]}>
          <View style={styles.header}>
            <Ionicons
              name="disc-outline"
              size={32}
              color={themeStyles.icon.color}
            />
            <View style={styles.headerText}>
              <Text
                style={[styles.title, themeStyles.title]}
                numberOfLines={1}
              >
                {selectedAlbumTitle}
              </Text>
              <Text
                style={[styles.artist, themeStyles.artist]}
                numberOfLines={1}
              >
                {selectedAlbumArtist}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.option} onPress={handleDownloadAlbum} disabled={downloading}>
            {downloading ? (
              <SpinningLoaderCircle size={26} color={themeStyles.icon.color} />
            ) : (
              <Ionicons
                name="arrow-down-circle"
                size={26}
                color={themeStyles.icon.color}
              />
            )}
            <Text style={[styles.optionText, themeStyles.optionText]}>
              {t('externalAlbum.menu.downloadToServer')}
            </Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
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
  headerText: { flex: 1, marginLeft: 12 },
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
  optionText: { marginLeft: 16, fontSize: 16 },
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