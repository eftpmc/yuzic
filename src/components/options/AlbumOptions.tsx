import React, { forwardRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { ListEnd } from 'lucide-react-native';

import { Album } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import { usePlaying } from '@/contexts/PlayingContext';
import { useDownload } from '@/contexts/DownloadContext';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';

export type AlbumOptionsProps = {
  album: Album | null;
  /** Hide "Go to Album" when already on the album screen */
  hideGoToAlbum?: boolean;
};

const AlbumOptions = forwardRef<
  React.ElementRef<typeof BottomSheetModal>,
  AlbumOptionsProps
>(({ album, hideGoToAlbum }, ref) => {
  const { isDarkMode } = useTheme();
  const themeStyles = isDarkMode ? stylesDark : stylesLight;
  const navigation = useNavigation<any>();

  const {
    playSongInCollection,
    addCollectionToQueue,
    shuffleCollectionToQueue,
    getQueue,
  } = usePlaying();

  const { downloadAlbumById, isAlbumDownloaded, isDownloadingAlbum } =
    useDownload();

  const snapPoints = useMemo(() => ['55%', '90%'], []);

  const close = () => {
    (ref as any)?.current?.dismiss();
  };

  const songs = album?.songs ?? [];
  const isDownloaded = album ? isAlbumDownloaded(album.id) : false;
  const isDownloading = album ? isDownloadingAlbum(album.id) : false;

  const handlePlay = (shuffle: boolean) => {
    if (!album || !songs.length) return;
    playSongInCollection(songs[0], album, shuffle);
    close();
  };

  const handleAddToQueue = () => {
    if (!album || !songs.length) return;
    const queue = getQueue();
    if (queue.length === 0) {
      playSongInCollection(songs[0], album, false);
    } else {
      addCollectionToQueue(album);
    }
    close();
  };

  const handleShuffleToQueue = () => {
    if (!album || !songs.length) return;
    const queue = getQueue();
    if (queue.length === 0) {
      playSongInCollection(songs[0], album, true);
    } else {
      shuffleCollectionToQueue(album);
    }
    close();
  };

  const handleGoToAlbum = () => {
    if (!album) return;
    close();
    navigation.navigate('(home)', { screen: 'albumView', params: { id: album.id } });
  };

  const handleDownload = async () => {
    if (!album || isDownloaded || isDownloading) return;
    await downloadAlbumById(album.id);
    close();
  };

  if (!album) {
    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        handleIndicatorStyle={{
          backgroundColor: isDarkMode ? '#555' : '#ccc',
        }}
        backgroundStyle={[styles.sheetBackground, themeStyles.sheetBackground]}
      >
        <View style={[styles.loading, themeStyles.sheetBackground]}>
          <ActivityIndicator size="large" color={themeStyles.artist.color} />
        </View>
      </BottomSheetModal>
    );
  }

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      handleIndicatorStyle={{
        backgroundColor: isDarkMode ? '#555' : '#ccc',
      }}
      backgroundStyle={[styles.sheetBackground, themeStyles.sheetBackground]}
      stackBehavior="push"
    >
      <BottomSheetScrollView
        style={themeStyles.sheetBackground}
        contentContainerStyle={styles.sheetContent}
      >
        <View style={styles.header}>
          <MediaImage cover={album.cover} size="grid" style={styles.cover} />
          <View style={styles.headerText}>
            <Text
              style={[styles.title, themeStyles.title]}
              numberOfLines={2}
            >
              {album.title}
            </Text>
            <Text
              style={[styles.artist, themeStyles.artist]}
              numberOfLines={1}
            >
              {album.artist?.name ?? ''}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.option} onPress={() => handlePlay(false)}>
          <Ionicons name="play" size={26} color={themeStyles.icon.color} />
          <Text style={[styles.optionText, themeStyles.optionText]}>Play</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={() => handlePlay(true)}>
          <Ionicons name="shuffle" size={26} color={themeStyles.icon.color} />
          <Text style={[styles.optionText, themeStyles.optionText]}>Shuffle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={handleAddToQueue}>
          <ListEnd size={26} color={themeStyles.icon.color} />
          <Text style={[styles.optionText, themeStyles.optionText]}>Add to Queue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={handleShuffleToQueue}>
          <Ionicons name="shuffle" size={26} color={themeStyles.icon.color} />
          <Text style={[styles.optionText, themeStyles.optionText]}>Shuffle to Queue</Text>
        </TouchableOpacity>

        {!hideGoToAlbum && (
          <TouchableOpacity style={styles.option} onPress={handleGoToAlbum}>
            <Ionicons name="albums" size={26} color={themeStyles.icon.color} />
            <Text style={[styles.optionText, themeStyles.optionText]}>Go to Album</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.option}
          onPress={handleDownload}
          disabled={isDownloaded || isDownloading}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color={themeStyles.artist.color} />
          ) : (
            <Ionicons
              name={isDownloaded ? 'checkmark-circle' : 'arrow-down-circle'}
              size={26}
              color={isDownloaded || isDownloading ? themeStyles.artist.color : themeStyles.icon.color}
            />
          )}
          <Text
            style={[
              styles.optionText,
              themeStyles.optionText,
              (isDownloaded || isDownloading) && { opacity: 0.6 },
            ]}
          >
            {isDownloading ? 'Downloading…' : isDownloaded ? 'Downloaded' : 'Download'}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <Text style={[styles.sectionLabel, themeStyles.artist]}>Album Info</Text>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, themeStyles.artist]}>Artist</Text>
          <Text style={[styles.infoValue, themeStyles.title]} numberOfLines={1}>
            {album.artist?.name ?? '—'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, themeStyles.artist]}>Year</Text>
          <Text style={[styles.infoValue, themeStyles.title]}>{album.year ?? '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, themeStyles.artist]}>Genres</Text>
          <Text style={[styles.infoValue, themeStyles.title]} numberOfLines={1}>
            {album.genres?.length ? album.genres.join(', ') : '—'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, themeStyles.artist]}>Songs</Text>
          <Text style={[styles.infoValue, themeStyles.title]}>{songs.length}</Text>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

AlbumOptions.displayName = 'AlbumOptions';

export default AlbumOptions;

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
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
  title: { fontSize: 16, fontWeight: '600' },
  artist: { fontSize: 14, marginTop: 2 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#444',
    marginVertical: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  optionText: { marginLeft: 16, fontSize: 16 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500', marginLeft: 12, flex: 1, textAlign: 'right' },
});

const stylesLight = StyleSheet.create({
  sheetBackground: { backgroundColor: '#F2F2F7' },
  title: { color: '#000' },
  artist: { color: '#666' },
  optionText: { color: '#000' },
  icon: { color: '#000' },
});

const stylesDark = StyleSheet.create({
  sheetBackground: { backgroundColor: '#222' },
  title: { color: '#fff' },
  artist: { color: '#aaa' },
  optionText: { color: '#fff' },
  icon: { color: '#999' },
});
