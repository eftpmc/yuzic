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
import { MediaImage } from '@/components/MediaImage';
import { CoverSource, Album } from '@/types';
import ContextMenuModal, {
  ContextMenuAction,
} from '@/components/ContextMenuModal';
import InfoModal, { InfoRow } from '@/components/InfoModal';
import { useTheme } from '@/hooks/useTheme';
import { staleTime } from '@/constants/staleTime';

interface ItemProps {
  id: string;
  title: string;
  subtext: string;
  cover: CoverSource;
  isGridView: boolean;
  gridWidth: number;
}

const AlbumItem: React.FC<ItemProps> = ({
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

  const { downloadAlbumById, isAlbumDownloaded, isDownloadingAlbum } =
    useDownload();

  const { isDarkMode } = useTheme();
  const navigation = useNavigation<any>();
  const api = useApi();
  const queryClient = useQueryClient();

  const [menuVisible, setMenuVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [albumInfo, setAlbumInfo] = useState<Album | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isDownloaded = isAlbumDownloaded(id);
  const isDownloadingNow = isDownloadingAlbum(id);

  const handleNavigation = useCallback(() => {
    navigation.navigate('albumView', { id });
  }, [navigation, id]);

  const fetchAlbum = useCallback(async () => {
    return queryClient.fetchQuery({
      queryKey: [QueryKeys.Album, id],
      queryFn: () => api.albums.get(id),
      staleTime: staleTime.albums,
    });
  }, [api, queryClient, id]);

  const handlePlay = useCallback(
    async (shuffle: boolean) => {
      const album = await fetchAlbum();
      if (!album || !album.songs?.length) return;
      playSongInCollection(album.songs[0], album, shuffle);
    },
    [fetchAlbum, playSongInCollection]
  );

  const handleAddToQueue = useCallback(async () => {
    const album = await fetchAlbum();
    if (!album || !album.songs.length) return;

    const queue = getQueue();
    if (queue.length === 0) {
      playSongInCollection(album.songs[0], album, false);
      return;
    }

    addCollectionToQueue(album);
  }, [fetchAlbum, getQueue, addCollectionToQueue, playSongInCollection]);

  const handleShuffleToQueue = useCallback(async () => {
    const album = await fetchAlbum();
    if (!album || !album.songs.length) return;

    const queue = getQueue();
    if (queue.length === 0) {
      playSongInCollection(album.songs[0], album, true);
      return;
    }

    shuffleCollectionToQueue(album);
  }, [
    fetchAlbum,
    getQueue,
    shuffleCollectionToQueue,
    playSongInCollection,
  ]);

  const handleShowInfo = useCallback(async () => {
    const album = await fetchAlbum();
    if (!album) return;
    setAlbumInfo(album);
    setInfoVisible(true);
  }, [fetchAlbum]);

  const handleDownload = useCallback(async () => {
    if (isDownloaded || isDownloadingNow || isLoading) return;
    setIsLoading(true);
    try {
      await downloadAlbumById(id);
    } finally {
      setIsLoading(false);
    }
  }, [id, isDownloaded, isDownloadingNow, isLoading, downloadAlbumById]);

  const infoRows: InfoRow[] = useMemo(() => {
    if (!albumInfo) return [];
    return [
      {
        id: 'artist',
        label: 'Artist',
        value: albumInfo.artist.name
      },
      {
        id: 'year',
        label: 'Year',
        value: albumInfo.year
      },
      {
        id: 'genres',
        label: 'Genres',
        value: albumInfo.genres.join(', ')
      },
      {
        id: 'songs',
        label: 'Songs',
        value: albumInfo.songs.length
      },
    ];
  }, [albumInfo]);

  const menuActions: ContextMenuAction[] = [
    {
      id: 'play',
      label: 'Play',
      icon: 'play',
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
      label: 'Album Info',
      icon: 'information-circle',
      dividerBefore: true,
      onPress: () => {
        setMenuVisible(false);
        handleShowInfo();
      },
    },
    {
      id: 'navigate',
      label: 'Go to Album',
      icon: 'albums',
      onPress: handleNavigation,
    },
    {
      id: 'download',
      label: isDownloadingNow
        ? 'Downloading…'
        : isDownloaded
        ? 'Downloaded'
        : 'Download',
      icon: isDownloaded ? 'checkmark-circle' : 'arrow-down-circle',
      disabled: isDownloaded || isDownloadingNow,
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
              ? { width: gridWidth, aspectRatio: 1, borderRadius: 10 }
              : { width: 52, height: 52, borderRadius: 8, marginRight: 12 }
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

      {albumInfo && (
        <InfoModal
          visible={infoVisible}
          onClose={() => setInfoVisible(false)}
          title={albumInfo.title}
          subtitle={albumInfo.subtext}
          cover={albumInfo.cover}
          rows={infoRows}
        />
      )}
    </>
  );
};

export default AlbumItem;

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
    borderRadius: 14,
  },
  gridTextContainer: {
    marginTop: 6,
    width: '100%',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  titleDark: {
    color: '#e6e6e6',
  },
  subtext: {
    fontSize: 13,
    color: '#666',
  },
  subtextDark: {
    color: '#aaa',
  },
  pressed: {
    opacity: 0.9,
  },
});