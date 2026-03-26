import React, { useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
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
  const [downloading, setDownloading] = useState(false);

  const infoSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['25%'], []);

  const songs = album.songs ?? [];

  const handleDownload = async () => {
    if (downloading || !album.title || !album.artist) return;
    const hasDownloader =
      (isLidarrActive && isLidarrConnected) ||
      (isSlskdActive && isSlskdConnected);
    if (!hasDownloader) {
      toast.error(t('externalAlbum.download.noDownloader'));
      return;
    }
    setDownloading(true);
    try {
      if (isLidarrActive && isLidarrConnected) {
        const result = await lidarr.downloadAlbum(lidarrConfig, album.title, album.artist);
        toast[result.success ? 'success' : 'error'](
          result.success
            ? t('externalAlbum.download.addedToLidarr')
            : (result.message ?? t('externalAlbum.download.failed'))
        );
        return;
      }
      if (isSlskdActive && isSlskdConnected) {
        const result = await slskd.downloadAlbum(slskdConfig, album.title, album.artist);
        toast[result.success ? 'success' : 'error'](
          result.success
            ? t('externalAlbum.download.addedToSlskd')
            : (result.message ?? t('externalAlbum.download.failed'))
        );
        return;
      }
    } catch {
      toast.error(t('externalAlbum.download.startFailed'));
    } finally {
      setDownloading(false);
    }
  };

  const metadataItems = useMemo(() => {
    const items: string[] = [];
    if (album.artist) items.push(album.artist);
    if (songs.length > 0) items.push(t('externalAlbum.header.songs', { count: songs.length }));
    return items;
  }, [album.artist, songs.length, t]);

  const themeStyles = isDarkMode ? stylesDark : stylesLight;

  return (
    <>
      <View style={styles.container}>
        {/* Header nav */}
        <View style={[styles.headerRow, { borderBottomColor: isDarkMode ? '#1C1C1E' : '#D1D1D6' }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color={isDarkMode ? '#fff' : '#1C1C1E'} />
          </TouchableOpacity>

          <View pointerEvents="none" style={styles.headerTitleWrapper}>
            <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]} numberOfLines={1}>
              {album.title}
            </Text>
          </View>

          <TouchableOpacity onPress={() => infoSheetRef.current?.present()} style={styles.headerButton}>
            <Ionicons name="information-circle-outline" size={24} color={isDarkMode ? '#fff' : '#1C1C1E'} />
          </TouchableOpacity>
        </View>

        {/* Cover */}
        <View style={styles.coverWrapper}>
          <MediaImage cover={album.cover} size="detail" style={styles.coverImage} />
        </View>

        {/* Title + metadata */}
        <View style={styles.titleInfo}>
          <Text style={[styles.title, themeStyles.title]} numberOfLines={2}>
            {album.title}
          </Text>
          <View style={styles.metaRow}>
            {metadataItems.map((item, index) => (
              <React.Fragment key={`${item}-${index}`}>
                {index > 0 && (
                  <Text style={[styles.metaDot, themeStyles.subtext]}>•</Text>
                )}
                {index === 0 && album.artist ? (
                  <TouchableOpacity
                    onPress={() =>
                      (navigation as any).navigate('externalArtistView', { mbid: album.artistMbid, name: album.artist })
                    }
                  >
                    <Text style={[styles.subtext, themeStyles.subtext]} numberOfLines={1}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.subtext, themeStyles.subtext]} numberOfLines={1}>
                    {item}
                  </Text>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.downloadButton, { backgroundColor: themeColor }]}
            onPress={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <SpinningLoaderCircle size={24} color="#fff" />
            ) : (
              <LucideDownload size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <BottomSheetModal
        ref={infoSheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backgroundStyle={{ backgroundColor: isDarkMode ? '#1c1c1e' : '#f9f9f9' }}
        handleIndicatorStyle={{ backgroundColor: isDarkMode ? '#555' : '#ccc' }}
      >
        <BottomSheetView style={styles.sheetContainer}>
          <Text style={[styles.sheetTitle, isDarkMode && styles.sheetTitleDark]}>
            {t('externalAlbum.info.title')}
          </Text>
          <Text style={[styles.sheetBody, isDarkMode && styles.sheetBodyDark]}>
            {t('externalAlbum.info.body')}
          </Text>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
};

export default ExternalAlbumHeader;

const styles = StyleSheet.create({
  container: {
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    maxWidth: '60%',
  },
  headerTitleDark: {
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
  titleInfo: {
    width: '100%',
    marginBottom: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
  },
  metaDot: {
    fontSize: 14,
    marginHorizontal: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    maxWidth: '94%',
    marginTop: 4,
  },
  actionsRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  downloadButton: {
    borderRadius: 22,
    width: 112,
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

const stylesLight = StyleSheet.create({
  title: { color: '#000' },
  subtext: { color: '#666' },
});

const stylesDark = StyleSheet.create({
  title: { color: '#fff' },
  subtext: { color: '#aaa' },
});
