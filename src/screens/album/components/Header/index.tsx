import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { Album } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import DownloadOptions from '@/components/options/DownloadOptions';

import { usePlaying } from '@/contexts/PlayingContext';
import { useDownload } from '@/contexts/DownloadContext';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  album: Album;
};

const AlbumHeader: React.FC<Props> = ({ album }) => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);

  const { playSongInCollection } = usePlaying();
  const { isAlbumDownloaded, isDownloadingAlbum, downloadAlbumById } =
    useDownload();

  const songs = album.songs ?? [];

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
      {/* Header buttons */}
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
          onDownload={() => downloadAlbumById(album.id)}
          isDownloaded={isAlbumDownloaded(album.id)}
          isLoading={isDownloadingAlbum(album.id)}
        />
      </View>

      {/* Album cover */}
      <View style={styles.coverWrapper}>
        <MediaImage
          cover={album.cover}
          size="detail"
          style={styles.coverImage}
        />
      </View>

      {/* Title + artist + actions */}
      <View style={styles.titleRow}>
        <View style={styles.titleInfo}>
          <Text style={styles.title(isDarkMode)} numberOfLines={1}>
            {album.title}
          </Text>

          {album.artist && (
            <TouchableOpacity
              style={styles.artistRow}
              onPress={() =>
                navigation.navigate('artistView', {
                  id: album.artist.id,
                })
              }
            >
              <MediaImage
                cover={album.artist.cover}
                size="thumb"
                style={styles.artistImage}
              />

              <Text
                style={styles.artistName(isDarkMode)}
                numberOfLines={1}
              >
                {album.artist.name}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.subtext(isDarkMode)}>
            {songs.length} songs · {formatDuration(totalDuration)}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.shuffleButton(isDarkMode)}
            onPress={() => {
              if (songs.length > 0) {
                playSongInCollection(songs[0], album, true);
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
            style={[
              styles.playButton,
              { backgroundColor: themeColor },
            ]}
            onPress={() => {
              if (songs.length > 0) {
                playSongInCollection(songs[0], album);
              }
            }}
          >
            <Ionicons name="play" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
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
  subtext: (isDark: boolean) => ({
    fontSize: 14,
    color: isDark ? '#aaa' : '#666',
  }),
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  artistImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  artistName: (isDark: boolean) => ({
    fontSize: 14,
    color: isDark ? '#fff' : '#333',
  }),

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  shuffleButton: (isDark: boolean) => ({
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? '#1c1c1e' : '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  }),

  playButton: {
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AlbumHeader;