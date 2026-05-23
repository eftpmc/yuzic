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
import { ChevronLeft, Ellipsis, Shuffle, Play, Check, Download, CheckCircle, ArrowDownCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { Album } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import AlbumOptions from '@/components/options/AlbumOptions';

import { usePlayingActions } from '@/contexts/PlayingContext';
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

  const { playSongInCollection } = usePlayingActions();
  const { downloadAlbumById, getCollectionDownloadState } = useDownload();

  const songs = useMemo(() => album.songs ?? [], [album.songs]);
  const songIds = useMemo(() => songs.map(s => s.id), [songs]);
  const { isDownloaded: isAlbumDownloaded, isDownloading: isAlbumDownloading } =
    getCollectionDownloadState(songIds);

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

  const handlePlay = useCallback(() => {
    if (songs.length > 0) playSongInCollection(songs[0], album, false);
  }, [songs, album, playSongInCollection]);

  const handleShuffle = useCallback(() => {
    if (songs.length > 0) playSongInCollection(songs[0], album, true);
  }, [songs, album, playSongInCollection]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <ChevronLeft size={24} color={colors.secondary} />
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
          <Ellipsis size={24} color={colors.secondary} />
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
            onPress={handleShuffle}
          >
            <Shuffle size={18} color={colors.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: themeColor }]}
            onPress={handlePlay}
          >
            <Play size={20} color="#fff" fill="#fff" />
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
                <Check size={18} color={colors.secondary} />
              </Animated.View>
            ) : (
              <Download size={18} color={colors.secondary} />
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
    marginBottom: 20,
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
