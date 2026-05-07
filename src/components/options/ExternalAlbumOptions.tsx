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
import { Ionicons } from '@expo/vector-icons';
import { CloudDownload } from 'lucide-react-native';
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
  const { isDarkMode } = useTheme();
  const themeStyles = isDarkMode ? stylesDark : stylesLight;

  const bottomSheetRef = useSheetRef();
  const downloadSheetRef = useSheetRef();
  const snapPoints = useMemo(() => ['30%'], []);

  const status = useExternalAlbumStatus(album);

  const isLidarrConnected = useSelector(selectLidarrAuthenticated);
  const isSlskdConnected = useSelector(selectSlskdAuthenticated);

  const canDownload = isLidarrConnected || isSlskdConnected;

  return (
    <>
      <TouchableOpacity
        style={styles.moreButton}
        onPress={() => bottomSheetRef.current?.present()}
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
        handleIndicatorStyle={{ backgroundColor: isDarkMode ? '#555' : '#ccc' }}
        backgroundStyle={[styles.sheetBackground, themeStyles.sheetBackground]}
      >
        <BottomSheetView style={[styles.sheetContent, themeStyles.sheetBackground]}>
          <View style={styles.header}>
            <MediaImage cover={album.cover} size="grid" style={styles.cover} />
            <View style={styles.headerText}>
              <Text style={[styles.title, themeStyles.title]} numberOfLines={1}>
                {album.title}
              </Text>
              <Text style={[styles.artist, themeStyles.artist]} numberOfLines={1}>
                {album.artist}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {status.kind === 'in_library' ? (
            <View style={styles.option}>
              <Ionicons name="link" size={26} color="#34C759" />
              <Text style={[styles.optionText, themeStyles.optionText]}>
                {t('externalAlbum.menu.inLibrary')}
              </Text>
            </View>
          ) : status.kind === 'downloading' ? (
            <View style={styles.option}>
              <SpinningLoaderCircle size={26} color="#007AFF" />
              <Text style={[styles.optionText, themeStyles.optionText]}>
                {t('externalAlbum.menu.downloading', { progress: status.progress })}
              </Text>
            </View>
          ) : canDownload ? (
            <TouchableOpacity
              style={styles.option}
              onPress={() => downloadSheetRef.current?.present()}
            >
              <CloudDownload size={26} color={themeStyles.icon.color} />
              <Text style={[styles.optionText, themeStyles.optionText]}>
                {t('externalAlbum.menu.downloadToServer')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#555' : '#bbb'} style={styles.chevron} />
            </TouchableOpacity>
          ) : (
            <View style={styles.option}>
              <CloudDownload size={26} color={isDarkMode ? '#444' : '#ccc'} />
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
  disabledText: { color: '#888', fontSize: 14 },
  chevron: { marginLeft: 4 },
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
