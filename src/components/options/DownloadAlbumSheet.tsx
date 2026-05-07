import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSelector } from 'react-redux';
import { toast } from '@backpackapp-io/react-native-toast';

import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { MediaImage } from '@/components/MediaImage';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import * as lidarr from '@/api/lidarr';
import * as slskd from '@/api/slskd';
import {
  selectLidarrConfig,
  selectLidarrAuthenticated,
  selectSlskdConfig,
  selectSlskdAuthenticated,
} from '@/utils/redux/selectors/downloadersSelectors';
import type { ExternalAlbumBase } from '@/types';

const LIDARR_ICON = require('@assets/images/lidarr.png');
const SLSKD_ICON = require('@assets/images/slskd.png');

interface Props {
  album: ExternalAlbumBase;
  sheetRef: React.RefObject<BottomSheetModal>;
}

const DownloadAlbumSheet: React.FC<Props> = ({ album, sheetRef }) => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const themeStyles = isDarkMode ? stylesDark : stylesLight;

  const lidarrConfig = useSelector(selectLidarrConfig);
  const isLidarrConnected = useSelector(selectLidarrAuthenticated);
  const slskdConfig = useSelector(selectSlskdConfig);
  const isSlskdConnected = useSelector(selectSlskdAuthenticated);

  const [lidarrLoading, setLidarrLoading] = useState(false);
  const [slskdLoading, setSlskdLoading] = useState(false);

  const snapPoints = useMemo(() => ['35%'], []);
  const anyLoading = lidarrLoading || slskdLoading;

  const handleLidarr = async () => {
    if (anyLoading) return;
    setLidarrLoading(true);
    try {
      const result = await lidarr.downloadAlbum(lidarrConfig, album.title, album.artist);
      toast[result.success ? 'success' : 'error'](
        result.success
          ? t('externalAlbum.download.addedToLidarr')
          : (result.message ?? t('externalAlbum.download.failed'))
      );
      if (result.success) sheetRef.current?.dismiss();
    } catch {
      toast.error(t('externalAlbum.download.startFailed'));
    } finally {
      setLidarrLoading(false);
    }
  };

  const handleSlskd = async () => {
    if (anyLoading) return;
    setSlskdLoading(true);
    try {
      const result = await slskd.downloadAlbum(slskdConfig, album.title, album.artist);
      toast[result.success ? 'success' : 'error'](
        result.success
          ? t('externalAlbum.download.addedToSlskd')
          : (result.message ?? t('externalAlbum.download.failed'))
      );
      if (result.success) sheetRef.current?.dismiss();
    } catch {
      toast.error(t('externalAlbum.download.startFailed'));
    } finally {
      setSlskdLoading(false);
    }
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose={!anyLoading}
      backdropComponent={renderBackdrop}
      stackBehavior="push"
      handleIndicatorStyle={{ backgroundColor: isDarkMode ? '#555' : '#ccc' }}
      backgroundStyle={[styles.sheetBackground, themeStyles.sheetBackground]}
    >
      <BottomSheetView style={[styles.content, themeStyles.sheetBackground]}>
        <View style={styles.header}>
          <MediaImage cover={album.cover} size="thumb" style={styles.cover} />
          <View style={styles.headerText}>
            <Text style={[styles.title, themeStyles.title]} numberOfLines={1}>
              {album.title}
            </Text>
            <Text style={[styles.artist, themeStyles.artist]} numberOfLines={1}>
              {album.artist}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, themeStyles.divider]} />

        <Text style={[styles.sectionLabel, themeStyles.sectionLabel]}>
          {t('externalAlbum.download.chooseService')}
        </Text>

        {isLidarrConnected && (
          <TouchableOpacity
            style={styles.serviceRow}
            onPress={handleLidarr}
            disabled={anyLoading}
          >
            <Image
              source={LIDARR_ICON}
              style={styles.serviceIcon}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
            <View style={styles.serviceText}>
              <Text style={[styles.serviceName, themeStyles.serviceName]}>Lidarr</Text>
              <Text style={[styles.serviceDesc, themeStyles.serviceDesc]}>
                {t('externalAlbum.download.lidarrDesc')}
              </Text>
            </View>
            {lidarrLoading ? (
              <SpinningLoaderCircle size={18} color={isDarkMode ? '#aaa' : '#888'} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#555' : '#bbb'} />
            )}
          </TouchableOpacity>
        )}

        {isSlskdConnected && (
          <TouchableOpacity
            style={styles.serviceRow}
            onPress={handleSlskd}
            disabled={anyLoading}
          >
            <Image
              source={SLSKD_ICON}
              style={styles.serviceIcon}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
            <View style={styles.serviceText}>
              <Text style={[styles.serviceName, themeStyles.serviceName]}>Soulseek</Text>
              <Text style={[styles.serviceDesc, themeStyles.serviceDesc]}>
                {t('externalAlbum.download.slskdDesc')}
              </Text>
            </View>
            {slskdLoading ? (
              <SpinningLoaderCircle size={18} color={isDarkMode ? '#aaa' : '#888'} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#555' : '#bbb'} />
            )}
          </TouchableOpacity>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
};

export default DownloadAlbumSheet;

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  cover: {
    width: 40,
    height: 40,
    borderRadius: 6,
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
    marginVertical: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  serviceIcon: {
    width: 36,
    height: 36,
  },
  serviceText: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
  },
  serviceDesc: {
    fontSize: 13,
    marginTop: 1,
  },
});

const stylesLight = StyleSheet.create({
  sheetBackground: { backgroundColor: '#F2F2F7' },
  title: { color: '#000' },
  artist: { color: '#666' },
  divider: { backgroundColor: '#D1D1D6' },
  sectionLabel: { color: '#999' },
  serviceName: { color: '#000' },
  serviceDesc: { color: '#888' },
  icon: { color: '#000' },
});

const stylesDark = StyleSheet.create({
  sheetBackground: { backgroundColor: '#222' },
  title: { color: '#fff' },
  artist: { color: '#aaa' },
  divider: { backgroundColor: '#3a3a3c' },
  sectionLabel: { color: '#666' },
  serviceName: { color: '#fff' },
  serviceDesc: { color: '#888' },
  icon: { color: '#999' },
});
