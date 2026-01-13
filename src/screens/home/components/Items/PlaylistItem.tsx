import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Appearance,
  Pressable,
} from 'react-native';
import { useDownload } from '@/contexts/DownloadContext';
import { usePlaying } from '@/contexts/PlayingContext';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { useSelector } from 'react-redux';
import { selectFavoritesPlaylist } from '@/utils/redux/selectors/selectFavoritesPlaylist';
import { MediaImage } from '@/components/MediaImage';
import { CoverSource, Playlist } from '@/types';
import { FAVORITES_ID } from '@/constants/favorites';
import ContextMenuModal, {
  ContextMenuAction,
} from '@/components/ContextMenuModal';
import InfoModal, { InfoRow } from '@/components/InfoModal';
import { useTheme } from '@/hooks/useTheme';

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
  const queryClient = useQueryClient();
  const api = useApi();

  const favorites = useSelector(selectFavoritesPlaylist);

  const [menuVisible, setMenuVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [playlistInfo, setPlaylistInfo] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isDownloaded = isPlaylistDownloaded(id);
  const isDownloading = isDownloadingPlaylist(id);

  const handleNavigation = useCallback(() => {
    navigation.navigate('playlistView', { id });
  }, [navigation, id]);

  const fetchPlaylist = useCallback(async () => {
    if (id === FAVORITES_ID) {
      if (!favorites || !favorites.songs?.length) return null;
      return {
        id: FAVORITES_ID,
        title: favorites.title ?? 'Favorites',
        cover: { kind: 'special', name: 'heart' },
        subtext: 'Playlist',
        songs: favorites.songs,
      } as Playlist;
    }

    return queryClient.fetchQuery({
      queryKey: [QueryKeys.Playlist, id],
      queryFn: () => api.playlists.get(id),
      staleTime: 2 * 60 * 1000,
    });
  }, [id, favorites, api, queryClient]);

  const handlePlay = useCallback(
    async (shuffle: boolean) => {
      const playlist = await fetchPlaylist();
      if (!playlist || !playlist.songs.length) return;
      playSongInCollection(playlist.songs[0], playlist, shuffle);
    },
    [fetchPlaylist, playSongInCollection]
  );

  const handleAddToQueue = useCallback(async () => {
    const playlist = await fetchPlaylist();
    if (!playlist || !playlist.songs.length) return;

    const queue = getQueue();
    if (queue.length === 0) {
      playSongInCollection(playlist.songs[0], playlist, false);
      return;
    }

    addCollectionToQueue(playlist);
  }, [
    fetchPlaylist,
    getQueue,
    addCollectionToQueue,
    playSongInCollection,
  ]);

  const handleShuffleToQueue = useCallback(async () => {
    const playlist = await fetchPlaylist();
    if (!playlist || !playlist.songs.length) return;

    const queue = getQueue();
    if (queue.length === 0) {
      playSongInCollection(playlist.songs[0], playlist, true);
      return;
    }

    shuffleCollectionToQueue(playlist);
  }, [
    fetchPlaylist,
    getQueue,
    shuffleCollectionToQueue,
    playSongInCollection,
  ]);

  const handleShowInfo = useCallback(async () => {
    const playlist = await fetchPlaylist();
    if (!playlist) return;
    setPlaylistInfo(playlist);
    setInfoVisible(true);
  }, [fetchPlaylist]);

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
      onPress: () => {
        setMenuVisible(false);
        handleAddToQueue();
      },
    },
    {
      id: 'shuffleQueue',
      label: 'Shuffle to Queue',
      icon: 'shuffle',
      onPress: () => {
        setMenuVisible(false);
        handleShuffleToQueue();
      },
    },
    {
      id: 'info',
      label: 'Playlist Info',
      icon: 'information-circle',
      dividerBefore: true,
      onPress: () => {
        setMenuVisible(false);
        handleShowInfo();
      },
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