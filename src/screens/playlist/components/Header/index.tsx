import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import { Playlist } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import PlaylistOptions from '@/components/options/PlaylistOptions';

import { usePlaying } from '@/contexts/PlayingContext';
import { useDownload } from '@/contexts/DownloadContext';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';

type Props = {
  playlist: Playlist;
};

const PlaylistHeader: React.FC<Props> = ({ playlist }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const optionsSheetRef = useRef<BottomSheetModal>(null);

  const { playSongInCollection } = usePlaying();
  const { downloadPlaylistById, getCollectionDownloadState } = useDownload();

  const songs = playlist.songs ?? [];
  const { isDownloaded: isPlaylistDownloaded, isDownloading: isPlaylistDownloading } =
    getCollectionDownloadState(songs.map((song) => song.id));

  const totalDuration = useMemo(() => {
    return songs.reduce((sum, song) => sum + Number(song.duration), 0);
  }, [songs]);

  const formatDuration = (duration: number) => {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
    }

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  const metadataItems = useMemo(
    () => [
      `${songs.length} ${songs.length === 1 ? t('common.song') : t('common.songs')}`,
      formatDuration(totalDuration),
    ],
    [songs.length, totalDuration, t]
  );
  const themeStyles = isDarkMode ? stylesDark : stylesLight;

  const toggleDownload = async () => {
    if (!songs.length || isPlaylistDownloading || isPlaylistDownloaded) return;
    await downloadPlaylistById(playlist.id);
  };

  return (
    <View style={styles.container}>
      {/* Header buttons */}
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
          <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]} numberOfLines={1}>
            {playlist.title}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => optionsSheetRef.current?.present()}
          style={styles.headerButton}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={24}
            color={isDarkMode ? '#fff' : '#1C1C1E'}
          />
        </TouchableOpacity>
      </View>

      <PlaylistOptions
        ref={optionsSheetRef}
        playlist={playlist}
        hideGoToPlaylist
      />

      {/* Playlist cover */}
      <View style={styles.coverWrapper}>
        <MediaImage
          cover={playlist.cover}
          size="detail"
          style={styles.coverImage}
        />
      </View>

      {/* Title + actions */}
      <View style={styles.titleInfo}>
        <Text style={[styles.title, themeStyles.title]} numberOfLines={2}>
          {playlist.title}
        </Text>

        <View style={styles.metaRow}>
          {metadataItems.map((item, index) => (
            <React.Fragment key={`${item}-${index}`}>
              {index > 0 && (
                <Text style={[styles.metaDot, themeStyles.subtext]} numberOfLines={1}>
                  •
                </Text>
              )}
              <Text style={[styles.subtext, themeStyles.subtext]} numberOfLines={1}>
                {item}
              </Text>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.secondaryButton, themeStyles.secondaryButton]}
            onPress={() => {
              if (songs.length > 0) {
                playSongInCollection(songs[0], playlist, true);
              }
            }}
          >
            <Ionicons
              name="shuffle"
              size={18}
              color={isDarkMode ? '#fff' : '#000'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: themeColor }]}
            onPress={() => {
              if (songs.length > 0) {
                playSongInCollection(songs[0], playlist);
              }
            }}
          >
            <Ionicons name="play" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, themeStyles.secondaryButton]}
            onPress={() => {
              void toggleDownload();
            }}
            disabled={isPlaylistDownloading}
          >
            {isPlaylistDownloading ? (
              <ActivityIndicator size="small" color={isDarkMode ? '#fff' : '#000'} />
            ) : (
              <Ionicons
                name={isPlaylistDownloaded ? 'checkmark' : 'download-outline'}
                size={18}
                color={isDarkMode ? '#fff' : '#000'}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
    width: 280,
    height: 280,
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
    alignSelf: 'center',
    flexWrap: 'nowrap',
    maxWidth: '94%',
    marginTop: 4,
  },
  actionsRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    borderRadius: 22,
    width: 112,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const stylesLight = StyleSheet.create({
  title: {
    color: '#000',
  },
  subtext: {
    color: '#666',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
  },
});

const stylesDark = StyleSheet.create({
  title: {
    color: '#fff',
  },
  subtext: {
    color: '#aaa',
  },
  secondaryButton: {
    backgroundColor: '#1c1c1e',
  },
});

export default PlaylistHeader;