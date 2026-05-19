import React, { useState } from 'react';
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


interface Props {
  album: ExternalAlbumBase;
  sheetRef: React.RefObject<BottomSheetModal>;
}

const DownloadAlbumSheet: React.FC<Props> = ({ album, sheetRef }) => {
  const { t } = useTranslation();
  const { isDarkMode, colors } = useTheme();

  const lidarrConfig = useSelector(selectLidarrConfig);
  const isLidarrConnected = useSelector(selectLidarrAuthenticated);
  const slskdConfig = useSelector(selectSlskdConfig);
  const isSlskdConnected = useSelector(selectSlskdAuthenticated);

  const [lidarrLoading, setLidarrLoading] = useState(false);
  const [slskdLoading, setSlskdLoading] = useState(false);

  const anyLoading = lidarrLoading || slskdLoading;
  const sheetBg = { backgroundColor: isDarkMode ? colors.card : colors.background };

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
      enableDynamicSizing
      enablePanDownToClose={!anyLoading}
      backdropComponent={renderBackdrop}
      stackBehavior="push"
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      backgroundStyle={[styles.sheetBackground, sheetBg]}
    >
      <BottomSheetScrollView style={sheetBg} contentContainerStyle={styles.content}>
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

        <Text style={[styles.sectionLabel, { color: colors.subtext }]}>
          {t('externalAlbum.download.chooseService')}
        </Text>

        {isLidarrConnected && (
          <TouchableOpacity
            style={[styles.option, anyLoading && styles.optionDisabled]}
            onPress={handleLidarr}
            disabled={anyLoading}
          >
            <View style={styles.serviceText}>
              <Text style={[styles.optionText, { color: colors.secondary }]}>Lidarr</Text>
              <Text style={[styles.serviceDesc, { color: colors.subtext }]}>
                {t('externalAlbum.download.lidarrDesc')}
              </Text>
            </View>
            {lidarrLoading
              ? <SpinningLoaderCircle size={18} color={colors.subtext} />
              : null}
          </TouchableOpacity>
        )}

        {isSlskdConnected && (
          <TouchableOpacity
            style={[styles.option, anyLoading && styles.optionDisabled]}
            onPress={handleSlskd}
            disabled={anyLoading}
          >
            <View style={styles.serviceText}>
              <Text style={[styles.optionText, { color: colors.secondary }]}>Soulseek</Text>
              <Text style={[styles.serviceDesc, { color: colors.subtext }]}>
                {t('externalAlbum.download.slskdDesc')}
              </Text>
            </View>
            {slskdLoading
              ? <SpinningLoaderCircle size={18} color={colors.subtext} />
              : null}
          </TouchableOpacity>
        )}
      </BottomSheetScrollView>
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
    padding: 16,
    paddingBottom: 48,
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  optionDisabled: {
    opacity: 0.55,
  },
  serviceText: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  serviceDesc: {
    fontSize: 13,
    marginTop: 1,
  },
});
