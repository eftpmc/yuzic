import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { PlaylistData } from '@/types';
import CoverArt from '@/components/CoverArt';
import DownloadOptions from '@/components/options/DownloadOptions';

import { useSettings } from '@/contexts/SettingsContext';
import { usePlaying } from '@/contexts/PlayingContext';
import { useDownload } from '@/contexts/DownloadContext';

type Props = {
  playlist: PlaylistData;
};

const Header: React.FC<Props> = ({ playlist }) => {
  const navigation = useNavigation();
  const isDarkMode = useColorScheme() === 'dark';
  const { themeColor } = useSettings();
  const { playSongInCollection } = usePlaying();
  const { isPlaylistDownloaded, isDownloadingPlaylist, downloadPlaylistById } =
    useDownload();

  const songs = playlist.songs ?? [];

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

  return (
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

        <DownloadOptions
          onDownload={() => downloadPlaylistById(playlist.id)}
          isDownloaded={isPlaylistDownloaded(playlist.id)}
          isLoading={isDownloadingPlaylist(playlist.id)}
        />
      </View>

      <View style={styles.coverWrapper}>
        <CoverArt
          source={
            playlist.id === 'favorite'
              ? 'heart-icon'
              : playlist.cover ?? null
          }
          size={280}
          isGrid
        />
      </View>

      <View style={styles.titleRow}>
        <View style={styles.titleInfo}>
          <Text style={styles.title(isDarkMode)} numberOfLines={1}>
            {playlist.title}
          </Text>

          <Text style={styles.subtext(isDarkMode)}>
            {songs.length} songs · {formatDuration(totalDuration)}
          </Text>
        </View>

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
      </View>
    </View>
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
    justifyContent: 'space-between',
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
  subtext: (isDark: boolean) => ({
    fontSize: 14,
    color: isDark ? '#aaa' : '#666',
  }),
  playButton: {
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Header;
