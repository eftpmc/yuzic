import React, { useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSelector } from 'react-redux';
import { toast } from '@backpackapp-io/react-native-toast';

import { ExternalAlbum } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';
import {
  selectLidarrConfig,
  selectLidarrAuthenticated,
  selectIsLidarrActive,
  selectSlskdConfig,
  selectSlskdAuthenticated,
  selectIsSlskdActive,
} from '@/utils/redux/selectors/downloadersSelectors';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import * as lidarr from '@/api/lidarr';
import * as slskd from '@/api/slskd';
import { LucideDownload } from 'lucide-react-native';

type Props = {
  album: ExternalAlbum;
};

const ExternalAlbumHeader: React.FC<Props> = ({ album }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const lidarrConfig = useSelector(selectLidarrConfig);
  const isLidarrConnected = useSelector(selectLidarrAuthenticated);
  const isLidarrActive = useSelector(selectIsLidarrActive);
  const slskdConfig = useSelector(selectSlskdConfig);
  const isSlskdConnected = useSelector(selectSlskdAuthenticated);
  const isSlskdActive = useSelector(selectIsSlskdActive);

  const showDownload =
    (isLidarrActive && isLidarrConnected) ||
    (isSlskdActive && isSlskdConnected);
  const [downloading, setDownloading] = useState(false);

  const infoSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['25%'], []);

  const songs = album.songs ?? [];

  const handleDownload = async () => {
    if (!album.title || !album.artist || downloading) return;
    setDownloading(true);
    try {
      if (isLidarrActive && isLidarrConnected) {
        const result = await lidarr.downloadAlbum(
          lidarrConfig,
          album.title,
          album.artist
        );
        if (result.success) {
          toast.success(t('externalAlbum.download.addedToLidarr'));
        } else {
          toast.error(result.message ?? t('externalAlbum.download.failed'));
        }
        return;
      }
      if (isSlskdActive && isSlskdConnected) {
        const result = await slskd.downloadAlbum(
          slskdConfig,
          album.title,
          album.artist
        );
        if (result.success) {
          toast.success(t('externalAlbum.download.addedToSlskd'));
        } else {
          toast.error(result.message ?? t('externalAlbum.download.failed'));
        }
        return;
      }
      toast.error(t('externalAlbum.download.noDownloader'));
    } catch {
      toast.error(t('externalAlbum.download.startFailed'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <View style={styles.container}>
        <View style={[styles.headerRow, { borderBottomColor: isDarkMode ? '#1C1C1E' : '#D1D1D6' }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={isDarkMode ? '#fff' : '#1C1C1E'}
            />
          </TouchableOpacity>

          <View pointerEvents="none" style={styles.headerTitleWrapper}>
            <Text style={[styles.headerNavTitle, isDarkMode && styles.headerNavTitleDark]} numberOfLines={1}>
              {album.title}
            </Text>
          </View>

          <View style={styles.headerButton} />
        </View>

        <View style={styles.coverWrapper}>
          <MediaImage
            cover={album.cover}
            size="detail"
            style={styles.coverImage}
          />
        </View>

        <View style={styles.titleRow}>
          <View style={styles.titleInfo}>
            <Text style={styles.title(isDarkMode)} numberOfLines={1}>
              {album.title}
            </Text>

            <Text style={styles.artistName(isDarkMode)} numberOfLines={1}>
              {album.artist}
            </Text>

            <View style={styles.subRow}>
              <Text style={styles.subtext(isDarkMode)}>
                {t('externalAlbum.header.songs', { count: songs.length })}
              </Text>

              <TouchableOpacity
                style={[
                  styles.badge,
                  isDarkMode && styles.badgeDark,
                ]}
                onPress={() => infoSheetRef.current?.present()}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color={isDarkMode ? '#ccc' : '#555'}
                />
                <Text
                  style={[
                    styles.badgeText,
                    isDarkMode && styles.badgeTextDark,
                  ]}
                >
                  {t('externalAlbum.header.externalMetadata')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDownload ? (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.playButton, { backgroundColor: themeColor }]}
                onPress={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <LucideDownload
                    size={24}
                    color="#fff"
                  />
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>

      <BottomSheetModal
        ref={infoSheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backgroundStyle={{
          backgroundColor: isDarkMode ? '#1c1c1e' : '#f9f9f9',
        }}
        handleIndicatorStyle={{
          backgroundColor: isDarkMode ? '#555' : '#ccc',
        }}
      >
        <BottomSheetView style={styles.sheetContainer}>
          <Text
            style={[
              styles.sheetTitle,
              isDarkMode && styles.sheetTitleDark,
            ]}
          >
            {t('externalAlbum.info.title')}
          </Text>

          <Text
            style={[
              styles.sheetBody,
              isDarkMode && styles.sheetBodyDark,
            ]}
          >
            {t('externalAlbum.info.body')}
          </Text>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headerNavTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    maxWidth: '60%',
  },
  headerNavTitleDark: {
    color: '#fff',
  },
  headerButton: {
    padding: 6,
  },
  coverWrapper: {
    width: 280,
    height: 280,
    borderRadius: 16,
    marginTop: 32,
    marginBottom: 24,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  titleInfo: {
    flex: 1,
    paddingRight: 12,
  },
  title: (isDark: boolean) => ({
    fontSize: 24,
    fontWeight: 'bold',
    color: isDark ? '#fff' : '#000',
    marginBottom: 4,
  }),
  artistName: (isDark: boolean) => ({
    fontSize: 14,
    color: isDark ? '#fff' : '#333',
    marginBottom: 6,
  }),
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subtext: (isDark: boolean) => ({
    fontSize: 14,
    color: isDark ? '#aaa' : '#666',
  }),
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.06)',
    gap: 4,
  },
  badgeDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  badgeText: {
    fontSize: 12,
    color: '#555',
  },
  badgeTextDark: {
    color: '#ccc',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  playButton: {
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  sheetTitleDark: {
    color: '#fff',
  },
  sheetBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
  sheetBodyDark: {
    color: '#ccc',
  },
});

export default ExternalAlbumHeader;