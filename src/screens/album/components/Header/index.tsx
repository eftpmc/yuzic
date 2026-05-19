import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { Album } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import AlbumOptions from '@/components/options/AlbumOptions';

import { usePlaying } from '@/contexts/PlayingContext';
import { useDownload } from '@/contexts/DownloadContext';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';
import { useSheetRef } from '@/utils/useSheetRef';
import { formatDuration } from '@/utils/formatDuration';

type Props = {
  album: Album;
};

const AlbumHeader: React.FC<Props> = ({ album }) => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const optionsSheetRef = useSheetRef();

  const { playSongInCollection } = usePlaying();
  const { downloadAlbumById, getCollectionDownloadState } = useDownload();

  const songs = useMemo(() => album.songs ?? [], [album.songs]);
  const { isDownloaded: isAlbumDownloaded, isDownloading: isAlbumDownloading } =
    getCollectionDownloadState(songs.map((song) => song.id));

  const totalDuration = useMemo(
    () => songs.reduce((sum, song) => sum + Number(song.duration), 0),
    [songs]
  );

  const metadataItems = useMemo(() => {
    const items: { label: string; type: 'artist' | 'genre' | 'info' }[] = [];
    if (album.artist?.name) items.push({ label: album.artist.name, type: 'artist' });
    const genre = album.genres?.[0]?.trim();
    if (genre) items.push({ label: genre, type: 'genre' });
    const year = Number(album.year);
    if (Number.isFinite(year) && year > 0) items.push({ label: String(year), type: 'info' });
    if (!items.length) {
      items.push({ label: `${songs.length} songs`, type: 'info' });
      items.push({ label: formatDuration(totalDuration), type: 'info' });
    }
    return items;
  }, [album.artist?.name, album.genres, album.year, songs.length, totalDuration]);

  const handleGenrePress = useCallback((genre: string) => {
    (navigation as any).navigate('genreView', { genre });
  }, [navigation]);

  const checkmarkScale = useSharedValue(isAlbumDownloaded ? 1 : 0);

  useEffect(() => {
    if (isAlbumDownloaded) {
      checkmarkScale.value = withSequence(
        withSpring(1.2, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
    } else {
      checkmarkScale.value = 0;
    }
  }, [isAlbumDownloaded, checkmarkScale]);

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
  }));

  const toggleDownload = useCallback(async () => {
    if (!songs.length || isAlbumDownloading || isAlbumDownloaded) return;
    await downloadAlbumById(album.id, songs);
  }, [songs, isAlbumDownloading, isAlbumDownloaded, downloadAlbumById, album.id]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={colors.secondary} />
        </TouchableOpacity>

        <View pointerEvents="none" style={styles.headerTitleWrapper}>
          <Text style={[styles.headerTitle, { color: colors.secondary }]} numberOfLines={1}>
            {album.title}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => optionsSheetRef.current?.present()}
          style={styles.headerButton}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      <AlbumOptions ref={optionsSheetRef} album={album} hideGoToAlbum />

      <View style={styles.coverWrapper}>
        <MediaImage cover={album.cover} size="detail" style={styles.coverImage} />
      </View>

      <View style={styles.titleInfo}>
        <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={2}>
          {album.title}
        </Text>

        <View style={styles.metaRow}>
          {metadataItems.map((item, index) => (
            <React.Fragment key={`${item.label}-${index}`}>
              {index > 0 && (
                <Text style={[styles.metaDot, { color: colors.subtext }]} numberOfLines={1}>
                  •
                </Text>
              )}
              {item.type === 'artist' && album.artist ? (
                <TouchableOpacity
                  onPress={() => (navigation as any).navigate('artistView', { id: album.artist.id })}
                >
                  <Text style={[styles.subtext, { color: colors.subtext }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ) : item.type === 'genre' ? (
                <TouchableOpacity onPress={() => handleGenrePress(item.label)}>
                  <Text style={[styles.subtext, { color: colors.subtext }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.subtext, { color: colors.subtext }]} numberOfLines={1}>
                  {item.label}
                </Text>
              )}
            </React.Fragment>
          ))}
        </View>
      </View>

      <View style={styles.actionsRow}>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.card }]}
            onPress={() => songs.length > 0 && playSongInCollection(songs[0], album, true)}
          >
            <Ionicons name="shuffle" size={18} color={colors.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: themeColor }]}
            onPress={() => songs.length > 0 && playSongInCollection(songs[0], album)}
          >
            <Ionicons name="play" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.card }]}
            onPress={() => void toggleDownload()}
            disabled={isAlbumDownloading}
          >
            {isAlbumDownloading ? (
              <ActivityIndicator size="small" color={colors.secondary} />
            ) : isAlbumDownloaded ? (
              <Animated.View style={checkmarkStyle}>
                <Ionicons name="checkmark" size={18} color={colors.secondary} />
              </Animated.View>
            ) : (
              <Ionicons name="download-outline" size={18} color={colors.secondary} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default AlbumHeader;

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
  },
  headerTitleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    maxWidth: '60%',
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
    fontWeight: '600',
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
