import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useDownload } from '@/contexts/DownloadContext';
import { usePlaying } from '@/contexts/PlayingContext';
import { useNavigation } from '@react-navigation/native';
import { MediaImage } from '@/components/MediaImage';
import { CoverSource, Playlist } from '@/types';
import ContextMenuModal, {
  ContextMenuAction,
} from '@/components/ContextMenuModal';
import InfoModal, { InfoRow } from '@/components/InfoModal';
import { useTheme } from '@/hooks/useTheme';
import { usePlaylist } from '@/hooks/playlists';

interface ItemProps {
  id: string;
  title: string;
  subtext: string;
  cover: CoverSource;
  isGridView: boolean;
  gridWidth: number;
}

const PlaylistItem: React.FC<ItemProps> = ({
  id,
  title,
  subtext,
  cover,
  isGridView,
  gridWidth,
}) => {
  const {
    playSongInCollection,
    addCollectionToQueue,
    shuffleCollectionToQueue,
    getQueue,
  } = usePlaying();

  const {
    downloadPlaylistById,
    isPlaylistDownloaded,
    isDownloadingPlaylist,
  } = useDownload();

  const { isDarkMode } = useTheme();
  const navigation = useNavigation<any>();

  const { playlist } = usePlaylist(id);

  const [menuVisible, setMenuVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [playlistInfo, setPlaylistInfo] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isDownloaded = isPlaylistDownloaded(id);
  const isDownloading = isDownloadingPlaylist(id);

  const handleNavigation = useCallback(() => {
    navigation.navigate('playlistView', { id });
  }, [navigation, id]);

  const handlePlay = useCallback(
    async (shuffle: boolean) => {
      if (!playlist || !playlist.songs.length) return;
      playSongInCollection(playlist.songs[0], playlist, shuffle);
    },
    [playlist, playSongInCollection]
  );

  const handleAddToQueue = useCallback(async () => {
    if (!playlist || !playlist.songs.length) return;

    const queue = getQueue();
    if (queue.length === 0) {
      playSongInCollection(playlist.songs[0], playlist, false);
      return;
    }

    addCollectionToQueue(playlist);
  }, [
    playlist,
    getQueue,
    addCollectionToQueue,
    playSongInCollection,
  ]);

  const handleShuffleToQueue = useCallback(async () => {
    if (!playlist || !playlist.songs.length) return;

    const queue = getQueue();
    if (queue.length === 0) {
      playSongInCollection(playlist.songs[0], playlist, true);
      return;
    }

    shuffleCollectionToQueue(playlist);
  }, [
    playlist,
    getQueue,
    shuffleCollectionToQueue,
    playSongInCollection,
  ]);

  const handleShowInfo = useCallback(() => {
    if (!playlist) return;
    setPlaylistInfo(playlist);
    setInfoVisible(true);
  }, [playlist]);

  const handleDownload = useCallback(async () => {
    if (isDownloaded || isDownloading || isLoading) return;
    setIsLoading(true);
    try {
      await downloadPlaylistById(id);
    } finally {
      setIsLoading(false);
    }
  }, [id, isDownloaded, isDownloading, isLoading, downloadPlaylistById]);

  const infoRows: InfoRow[] = useMemo(() => {
    if (!playlistInfo) return [];
    return [
      {
        id: 'changed',
        label: 'Last changed',
        value: new Date(playlistInfo.changed).toDateString(),
      },
      {
        id: 'created',
        label: 'Created',
        value: new Date(playlistInfo.created).toDateString(),
      },
      {
        id: 'songs',
        label: 'Songs',
        value: playlistInfo.songs.length,
      },
    ];
  }, [playlistInfo]);

  const menuActions: ContextMenuAction[] = [
    {
      id: 'play',
      label: 'Play',
      icon: 'play',
      primary: true,
      onPress: () => handlePlay(false),
    },
    {
      id: 'shuffle',
      label: 'Shuffle',
      icon: 'shuffle',
      onPress: () => handlePlay(true),
    },
    {
      id: 'addQueue',
      label: 'Add to Queue',
      icon: 'list',
      dividerBefore: true,
      onPress: handleAddToQueue,
    },
    {
      id: 'shuffleQueue',
      label: 'Shuffle to Queue',
      icon: 'shuffle',
      onPress: handleShuffleToQueue,
    },
    {
      id: 'info',
      label: 'Playlist Info',
      icon: 'information-circle',
      dividerBefore: true,
      onPress: handleShowInfo,
    },
    {
      id: 'navigate',
      label: 'Go to Playlist',
      icon: 'list',
      onPress: handleNavigation,
    },
    {
      id: 'download',
      label: isDownloading
        ? 'Downloading…'
        : isDownloaded
        ? 'Downloaded'
        : 'Download',
      icon: isDownloaded ? 'checkmark-circle' : 'arrow-down-circle',
      disabled: isDownloaded || isDownloading,
      dividerBefore: true,
      onPress: handleDownload,
    },
  ];

  return (
    <>
      <Pressable
        onPress={handleNavigation}
        onLongPress={() => setMenuVisible(true)}
        delayLongPress={300}
        style={({ pressed }) => [
          isGridView
            ? [styles.gridItemContainer, { width: gridWidth }]
            : styles.itemContainer,
          pressed && styles.pressed,
        ]}
      >
        <MediaImage
          cover={cover}
          size={isGridView ? 'grid' : 'thumb'}
          style={
            isGridView
              ? { width: gridWidth, aspectRatio: 1, borderRadius: 8 }
              : { width: 50, height: 50, borderRadius: 4, marginRight: 12 }
          }
        />

        <View
          style={isGridView ? styles.gridTextContainer : styles.textContainer}
        >
          <Text
            style={[styles.title, isDarkMode && styles.titleDark]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[styles.subtext, isDarkMode && styles.subtextDark]}
            numberOfLines={1}
          >
            {subtext}
          </Text>
        </View>
      </Pressable>

      <ContextMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        actions={menuActions}
      />

      {playlistInfo && (
        <InfoModal
          visible={infoVisible}
          onClose={() => {
            setInfoVisible(false);
            setPlaylistInfo(null);
          }}
          title={playlistInfo.title}
          subtitle="Playlist"
          cover={playlistInfo.cover}
          rows={infoRows}
        />
      )}
    </>
  );
};

export default PlaylistItem;

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
  },
  gridItemContainer: {
    marginVertical: 8,
    marginHorizontal: 8,
    alignItems: 'flex-start',
    borderRadius: 14,
  },
  gridTextContainer: {
    marginTop: 4,
    width: '100%',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  titleDark: {
    color: '#e6e6e6',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
  },
  subtextDark: {
    color: '#aaa',
  },
  pressed: {
    opacity: 0.9,
  },
});