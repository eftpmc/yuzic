import React, { useMemo, useRef, useState } from 'react';
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

import { Album } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import AlbumOptions from '@/components/options/AlbumOptions';

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
  const optionsSheetRef = useRef<BottomSheetModal>(null);

  const { playSongInCollection } = usePlaying();
  const { downloadAlbumById, isTrackDownloaded } = useDownload();
  const [isTogglingDownload, setIsTogglingDownload] = useState(false);

  const songs = album.songs ?? [];
  const isAlbumDownloaded = songs.length > 0 && songs.every(song => isTrackDownloaded(song.id));

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

  const metadataItems = useMemo(() => {
    const items: string[] = [];
    if (album.artist?.name) items.push(album.artist.name);
    const genre = album.genres?.[0]?.trim();
    if (genre) items.push(genre);
    const year = Number(album.year);
    if (Number.isFinite(year) && year > 0) items.push(String(year));
    if (!items.length) {
      items.push(`${songs.length} songs`);
      items.push(formatDuration(totalDuration));
    }
    return items;
  }, [album.artist?.name, album.genres, album.year, songs.length, totalDuration]);

  const toggleDownload = async () => {
    if (!songs.length || isTogglingDownload) return;
    setIsTogglingDownload(true);
    try {
      if (isAlbumDownloaded) return;

      await downloadAlbumById(album.id);
    } finally {
      setIsTogglingDownload(false);
    }
  };
  const themeStyles = isDarkMode ? stylesDark : stylesLight;

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

        <TouchableOpacity
          onPress={() => optionsSheetRef.current?.present()}
          style={styles.headerButton}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={24}
            color={isDarkMode ? '#fff' : '#000'}
          />
        </TouchableOpacity>
      </View>

      <AlbumOptions
        ref={optionsSheetRef}
        album={album}
        hideGoToAlbum
      />

      {/* Album cover */}
      <View style={styles.coverWrapper}>
        <MediaImage
          cover={album.cover}
          size="detail"
          style={styles.coverImage}
        />
      </View>

      {/* Title + artist/subtext metadata */}
      <View style={styles.titleInfo}>
        <Text style={[styles.title, themeStyles.title]} numberOfLines={2}>
          {album.title}
        </Text>

        <View style={styles.metaRow}>
          {metadataItems.map((item, index) => (
            <React.Fragment key={`${item}-${index}`}>
              {index > 0 && (
                <Text style={[styles.metaDot, themeStyles.subtext]} numberOfLines={1}>
                  •
                </Text>
              )}
              {index === 0 && album.artist ? (
                <TouchableOpacity
                  onPress={() =>
                    (navigation as any).navigate('artistView', {
                      id: album.artist.id,
                    })
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

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.secondaryButton, themeStyles.secondaryButton]}
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

          <TouchableOpacity
            style={[styles.secondaryButton, themeStyles.secondaryButton]}
            onPress={() => {
              void toggleDownload();
            }}
            disabled={isTogglingDownload}
          >
            {isTogglingDownload ? (
              <ActivityIndicator
                size="small"
                color={isDarkMode ? '#fff' : '#000'}
              />
            ) : (
              <Ionicons
                name={isAlbumDownloaded ? 'checkmark' : 'download-outline'}
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

export default AlbumHeader;