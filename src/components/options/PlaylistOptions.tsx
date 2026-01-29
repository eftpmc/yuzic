import React, { forwardRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { ListEnd } from 'lucide-react-native';
import { toast } from '@backpackapp-io/react-native-toast';

import { Playlist } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import { usePlaying } from '@/contexts/PlayingContext';
import { useDownload } from '@/contexts/DownloadContext';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';
import { useDeletePlaylist } from '@/hooks/playlists';
import { FAVORITES_ID } from '@/constants/favorites';

export type PlaylistOptionsProps = {
  playlist: Playlist | null;
  /** Hide "Go to Playlist" when already on the playlist screen */
  hideGoToPlaylist?: boolean;
};

const PlaylistOptions = forwardRef<
  React.ElementRef<typeof BottomSheetModal>,
  PlaylistOptionsProps
>(({ playlist, hideGoToPlaylist }, ref) => {
  const { isDarkMode } = useTheme();
  const themeStyles = isDarkMode ? stylesDark : stylesLight;
  const navigation = useNavigation<any>();

  const {
    playSongInCollection,
    addCollectionToQueue,
    shuffleCollectionToQueue,
    getQueue,
  } = usePlaying();

  const { downloadPlaylistById, isPlaylistDownloaded, isDownloadingPlaylist } =
    useDownload();

  const deletePlaylist = useDeletePlaylist();

  const snapPoints = useMemo(() => ['55%', '90%'], []);

  const close = () => {
    (ref as any)?.current?.dismiss();
  };

  const songs = playlist?.songs ?? [];
  const isDownloaded = playlist ? isPlaylistDownloaded(playlist.id) : false;
  const isDownloading = playlist ? isDownloadingPlaylist(playlist.id) : false;

  const handlePlay = (shuffle: boolean) => {
    if (!playlist || !songs.length) return;
    playSongInCollection(songs[0], playlist, shuffle);
    close();
  };

  const handleAddToQueue = () => {
    if (!playlist || !songs.length) return;
    const queue = getQueue();
    if (queue.length === 0) {
      playSongInCollection(songs[0], playlist, false);
    } else {
      addCollectionToQueue(playlist);
    }
    close();
  };

  const handleShuffleToQueue = () => {
    if (!playlist || !songs.length) return;
    const queue = getQueue();
    if (queue.length === 0) {
      playSongInCollection(songs[0], playlist, true);
    } else {
      shuffleCollectionToQueue(playlist);
    }
    close();
  };

  const handleGoToPlaylist = () => {
    if (!playlist) return;
    close();
    navigation.navigate('(home)', { screen: 'playlistView', params: { id: playlist.id } });
  };

  const handleDownload = async () => {
    if (!playlist || isDownloaded || isDownloading) return;
    await downloadPlaylistById(playlist.id);
    close();
  };

  const handleDeletePress = () => {
    if (!playlist || playlist.id === FAVORITES_ID) return;
    Alert.alert(
      'Delete playlist',
      `"${playlist.title}" will be permanently deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlaylist.mutateAsync(playlist.id);
              close();
              if (hideGoToPlaylist) {
                navigation.goBack();
              }
              toast.success('Playlist deleted');
            } catch {
              toast.error('Could not delete playlist');
            }
          },
        },
      ]
    );
  };

  if (!playlist) {
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
          <MediaImage cover={playlist.cover} size="grid" style={styles.cover} />
          <View style={styles.headerText}>
            <Text
              style={[styles.title, themeStyles.title]}
              numberOfLines={2}
            >
              {playlist.title}
            </Text>
            <Text style={[styles.artist, themeStyles.artist]}>Playlist</Text>
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

        {!hideGoToPlaylist && (
          <TouchableOpacity style={styles.option} onPress={handleGoToPlaylist}>
            <Ionicons name="list" size={26} color={themeStyles.icon.color} />
            <Text style={[styles.optionText, themeStyles.optionText]}>Go to Playlist</Text>
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

        {playlist.id !== FAVORITES_ID && (
          <TouchableOpacity
            style={styles.option}
            onPress={handleDeletePress}
            disabled={deletePlaylist.isPending}
          >
            {deletePlaylist.isPending ? (
              <ActivityIndicator size="small" color={themeStyles.artist.color} />
            ) : (
              <Ionicons name="trash-outline" size={26} color="#ff3b30" />
            )}
            <Text
              style={[
                styles.optionText,
                { color: '#ff3b30' },
                deletePlaylist.isPending && { opacity: 0.6 },
              ]}
            >
              Delete playlist
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.divider} />

        <Text style={[styles.sectionLabel, themeStyles.artist]}>Playlist Info</Text>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, themeStyles.artist]}>Last changed</Text>
          <Text style={[styles.infoValue, themeStyles.title]}>
            {playlist.changed ? new Date(playlist.changed).toDateString() : '—'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, themeStyles.artist]}>Created</Text>
          <Text style={[styles.infoValue, themeStyles.title]}>
            {playlist.created ? new Date(playlist.created).toDateString() : '—'}
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

PlaylistOptions.displayName = 'PlaylistOptions';

export default PlaylistOptions;

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
