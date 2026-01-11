import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Appearance,
} from 'react-native';
import { MenuView } from '@react-native-menu/menu';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useDownload } from '@/contexts/DownloadContext';
import { usePlaying } from '@/contexts/PlayingContext';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { MediaImage } from '@/components/MediaImage';
import { CoverSource } from '@/types';

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
    downloadAlbumById,
    isAlbumDownloaded,
    isDownloadingAlbum,
  } = useDownload();

  const colorScheme = Appearance.getColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const navigation = useNavigation();
  const api = useApi();
  const queryClient = useQueryClient();
  const { playSongInCollection } = usePlaying();

  const [isLoading, setIsLoading] = useState(false);

  const isDownloaded = isAlbumDownloaded(id);
  const isDownloadingNow = isDownloadingAlbum(id);

  const handlePlay = useCallback(
    async (shuffle: boolean) => {
      const album = await queryClient.fetchQuery({
        queryKey: [QueryKeys.Album, id],
        queryFn: () => api.albums.get(id),
        staleTime: 5 * 60 * 1000,
      });

      if (!album || album.songs.length === 0) return;
      playSongInCollection(album.songs[0], album, shuffle);
    },
    [id]
  );

  const handleDownload = async () => {
    if (isDownloaded || isDownloadingNow || isLoading) return;
    setIsLoading(true);
    try {
      await downloadAlbumById(id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigation = () => {
    navigation.navigate('albumView', { id });
  };

  const image = isGridView ? (
    <MediaImage
      cover={cover}
      size="grid"
      style={{
        width: gridWidth,
        aspectRatio: 1,
        borderRadius: 8,
      }}
    />
  ) : (
    <MediaImage
      cover={cover}
      size="thumb"
      style={{
        width: 50,
        height: 50,
        borderRadius: 4,
        marginRight: 12,
      }}
    />
  );

  const menuActions = [
    {
      id: 'play',
      title: 'Play',
      image: 'play.fill',
    },
    {
      id: 'shuffle',
      title: 'Shuffle',
      image: 'shuffle',
    },
    {
      id: 'go-to',
      title: 'Go to Album',
      image: 'music.note.list',
    },
    {
      id: 'download',
      title: isDownloadingNow
        ? 'Downloading…'
        : isDownloaded
          ? 'Downloaded'
          : 'Download',
      image: isDownloadingNow
        ? 'hourglass'
        : isDownloaded
          ? 'checkmark.circle'
          : 'arrow.down.circle',
      attributes: {
        disabled: isDownloaded || isDownloadingNow,
      },
    },
  ];

  const onMenuAction = ({ nativeEvent }: any) => {
    switch (nativeEvent.event) {
      case 'play':
        handlePlay(false);
        break;
      case 'shuffle':
        handlePlay(true);
        break;
      case 'go-to':
        handleNavigation();
        break;
      case 'download':
        handleDownload();
        break;
    }
  };

  return (
    <MenuView
      title={title || 'Options'}
      actions={menuActions}
      onPressAction={onMenuAction}
      shouldOpenOnLongPress
    >
      <TouchableOpacity
        onPress={handleNavigation}
        activeOpacity={0.9}
        style={
          isGridView
            ? [styles.gridItemContainer, { width: gridWidth }]
            : styles.itemContainer
        }
      >
        {image}

        <View
          style={
            isGridView ? styles.gridTextContainer : styles.textContainer
          }
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
      </TouchableOpacity>
    </MenuView>
  );
};

export default AlbumItem;

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  gridItemContainer: {
    marginVertical: 8,
    marginHorizontal: 8,
    alignItems: 'flex-start',
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
    fontWeight: 'bold',
    color: '#000',
  },
  titleDark: {
    color: '#ccc',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
  },
  subtextDark: {
    color: '#aaa',
  },
});