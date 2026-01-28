import React, { useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
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
} from '@/utils/redux/selectors/lidarrSelectors';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import * as lidarr from '@/api/lidarr';
import { LucideDownload } from 'lucide-react-native';

type Props = {
  album: ExternalAlbum;
};

const ExternalAlbumHeader: React.FC<Props> = ({ album }) => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const config = useSelector(selectLidarrConfig);
  const isLidarrConnected = useSelector(selectLidarrAuthenticated);
  const [downloading, setDownloading] = useState(false);

  const infoSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['25%'], []);

  const songs = album.songs ?? [];

  const handleDownload = async () => {
    if (!album.title || !album.artist || !config || downloading) return;
    setDownloading(true);
    try {
      const result = await lidarr.downloadAlbum(
        config,
        album.title,
        album.artist
      );
      if (result.success) {
        toast.success('Album added to Lidarr!');
      } else {
        toast.error(result.message ?? 'Download failed.');
      }
    } catch {
      toast.error('Failed to start download.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={isDarkMode ? '#fff' : '#000'}
            />
          </TouchableOpacity>
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
                {songs.length} songs
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
                  External metadata
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {isLidarrConnected ? (
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
            About external albums
          </Text>

          <Text
            style={[
              styles.sheetBody,
              isDarkMode && styles.sheetBodyDark,
            ]}
          >
            This album’s information is provided by MusicBrainz. Track listings, durations, artwork, or
            release details may be incomplete or differ from your local files.
          </Text>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerRow: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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