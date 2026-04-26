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
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';

export type PlaylistOptionsProps = {
  playlist: Playlist | null;
  /** Hide "Go to Playlist" when already on the playlist screen */
  hideGoToPlaylist?: boolean;
};

function formatDate(value: string | Date): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  const year = d.getFullYear();
  const month = d.toLocaleString('default', { month: 'short' });
  const day = d.getDate();
  return `${month} ${day}, ${year}`;
}

const PlaylistOptions = forwardRef<
  BottomSheetModal,
  PlaylistOptionsProps
>(({ playlist, hideGoToPlaylist }, ref) => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const themeStyles = isDarkMode ? stylesDark : stylesLight;
  const navigation = useNavigation<any>();

  const {
    playSongInCollection,
    addCollectionToQueue,
    shuffleCollectionToQueue,
    getQueue,
  } = usePlaying();

  const { downloadPlaylistById, getCollectionDownloadState } =
    useDownload();

  const deletePlaylist = useDeletePlaylist();

  const snapPoints = useMemo(() => ['55%', '90%'], []);

  const close = () => {
    (ref as any)?.current?.dismiss();
  };

  const songs = playlist?.songs ?? [];
  const { isDownloaded, isDownloading } = getCollectionDownloadState(
    songs.map((song) => song.id)
  );

  const handlePlay = (shuffle: boolean) => {
    if (!playlist || !songs.length) return;
    playSongInCollection(songs[0], playlist, shuffle);
    close();
  };

  const handleAddToQueue = () => {
    if (!playlist || !songs.length) return;
    const hasQueue = getQueue().length > 0;
    if (!hasQueue) {
      playSongInCollection(songs[0], playlist, false);
    } else {
      addCollectionToQueue(playlist);
    }
    close();
  };

  const handleShuffleToQueue = () => {
    if (!playlist || !songs.length) return;
    const hasQueue = getQueue().length > 0;
    if (!hasQueue) {
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
    await downloadPlaylistById(playlist.id, songs);
  };

  const handleDeletePress = () => {
    if (!playlist || playlist.id === FAVORITES_ID) return;
    Alert.alert(
      t('playlistOptions.delete.title'),
      t('playlistOptions.delete.body', { title: playlist.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlaylist.mutateAsync(playlist.id);
              close();
              if (hideGoToPlaylist) {
                navigation.goBack();
              }
              toast.success(t('playlistOptions.toasts.deleted'));
            } catch {
              toast.error(t('playlistOptions.toasts.deleteFailed'));
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
        enablePanDownToClose
        backdropComponent={renderBackdrop}
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
      enablePanDownToClose
      backdropComponent={renderBackdrop}
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
            <Text style={[styles.artist, themeStyles.artist]}>{t('playlistOptions.playlistLabel')}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.option} onPress={() => handlePlay(false)}>
          <Ionicons name="play" size={26} color={themeStyles.icon.color} />
          <Text style={[styles.optionText, themeStyles.optionText]}>{t('playlistOptions.actions.play')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={() => handlePlay(true)}>
          <Ionicons name="shuffle" size={26} color={themeStyles.icon.color} />
          <Text style={[styles.optionText, themeStyles.optionText]}>{t('playlistOptions.actions.shuffle')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={handleAddToQueue}>
          <ListEnd size={26} color={themeStyles.icon.color} />
          <Text style={[styles.optionText, themeStyles.optionText]}>{t('playlistOptions.actions.addToQueue')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={handleShuffleToQueue}>
          <Ionicons name="shuffle" size={26} color={themeStyles.icon.color} />
          <Text style={[styles.optionText, themeStyles.optionText]}>{t('playlistOptions.actions.shuffleToQueue')}</Text>
        </TouchableOpacity>

        {!hideGoToPlaylist && (
          <TouchableOpacity style={styles.option} onPress={handleGoToPlaylist}>
            <Ionicons name="list" size={26} color={themeStyles.icon.color} />
            <Text style={[styles.optionText, themeStyles.optionText]}>{t('playlistOptions.actions.goToPlaylist')}</Text>
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
            {isDownloading ? t('playlistOptions.actions.downloading') : isDownloaded ? t('playlistOptions.actions.downloaded') : t('playlistOptions.actions.download')}
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
              {t('playlistOptions.actions.delete')}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.divider} />

        <Text style={[styles.sectionLabel, themeStyles.artist]}>{t('playlistOptions.sections.info')}</Text>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, themeStyles.artist]}>{t('playlistOptions.info.lastChanged')}</Text>
          <Text style={[styles.infoValue, themeStyles.title]}>
            {formatDate(playlist.changed)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, themeStyles.artist]}>{t('playlistOptions.info.created')}</Text>
          <Text style={[styles.infoValue, themeStyles.title]}>
            {formatDate(playlist.created)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, themeStyles.artist]}>{t('playlistOptions.info.songs')}</Text>
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
