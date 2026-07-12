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
import { toast } from '@backpackapp-io/react-native-toast';

import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { MediaImage } from '@/components/MediaImage';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import {
  useDownloaderStates,
  type DownloaderId,
  type DownloaderState,
} from '@/features/downloaders/registry';
import type { ExternalAlbumBase } from '@/types';

interface Props {
  album: ExternalAlbumBase;
  /** When set, the sheet downloads this single track instead of the whole album. */
  track?: { title: string; artist: string };
  sheetRef: React.RefObject<BottomSheetModal>;
}

const DownloadSheet: React.FC<Props> = ({ album, track, sheetRef }) => {
  const { t } = useTranslation();
  const { isDarkMode, colors } = useTheme();

  const downloaders = useDownloaderStates();
  const available = downloaders.filter(
    (d) => d.isConnected && (!track || !!d.def.downloadTrack)
  );

  const [loadingId, setLoadingId] = useState<DownloaderId | null>(null);
  const anyLoading = loadingId !== null;

  const sheetBg = { backgroundColor: isDarkMode ? colors.card : colors.background };

  const handleDownload = async ({ def, config }: DownloaderState) => {
    if (anyLoading) return;
    setLoadingId(def.id);
    try {
      const result = track
        ? await def.downloadTrack!(config, { title: track.title, artist: track.artist })
        : await def.downloadAlbum(config, { title: album.title, artist: album.artist });
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
      backgroundStyle={[styles.sheetBackground, sheetBg]}
    >
      <BottomSheetScrollView style={sheetBg} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <MediaImage cover={album.cover} size="grid" style={styles.cover} />
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={1}>
              {headerTitle}
            </Text>
            <Text style={[styles.artist, { color: colors.subtext }]} numberOfLines={1}>
              {headerSubtext}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.sectionLabel, { color: colors.subtext }]}>
          {t('externalAlbum.download.chooseService')}
        </Text>

        {available.map((downloader) => (
          <TouchableOpacity
            key={downloader.def.id}
            style={[styles.option, anyLoading && styles.optionDisabled]}
            onPress={() => handleDownload(downloader)}
            disabled={anyLoading}
          >
            <View style={styles.serviceText}>
              <Text style={[styles.optionText, { color: colors.secondary }]}>
                {downloader.def.label}
              </Text>
              <Text style={[styles.serviceDesc, { color: colors.subtext }]}>
                {t(downloader.def.descriptionKey)}
              </Text>
            </View>
            {loadingId === downloader.def.id
              ? <SpinningLoaderCircle size={18} color={colors.subtext} />
              : null}
          </TouchableOpacity>
        ))}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};

export default DownloadSheet;

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
