import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Appearance,
  Pressable,
} from 'react-native';
import { usePlaying } from '@/contexts/PlayingContext';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/api';
import { Song, CoverSource, Artist } from '@/types';
import { QueryKeys } from '@/enums/queryKeys';
import { MediaImage } from '@/components/MediaImage';
import ContextMenuModal, {
  ContextMenuAction,
} from '@/components/ContextMenuModal';
import InfoModal, { InfoRow } from '@/components/InfoModal';
import { useTheme } from '@/hooks/useTheme';

interface ItemProps {
  id: string;
  name: string;
  subtext: string;
  cover: CoverSource;
  isGridView: boolean;
  gridWidth: number;
}

const ArtistItem: React.FC<ItemProps> = ({
  id,
  name,
  subtext,
  cover,
  isGridView,
  gridWidth,
}) => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const api = useApi();
  const { playSongInCollection } = usePlaying();

  const [menuVisible, setMenuVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [artistInfo, setArtistInfo] = useState<Artist | null>(null);

  const handleNavigation = useCallback(() => {
    navigation.navigate('artistView', { id });
  }, [navigation, id]);

  const fetchArtist = useCallback(async () => {
    return queryClient.fetchQuery({
      queryKey: [QueryKeys.Artist, id],
      queryFn: () => api.artists.get(id),
      staleTime: 10 * 60 * 1000,
    });
  }, [api, queryClient, id]);

  const handlePlay = useCallback(
    async (shuffle: boolean) => {
      const artist = await fetchArtist();
      if (!artist) return;

      const albumIds = artist.ownedAlbums.map(a => a.id);
      if (!albumIds.length) return;

      const albums = await Promise.all(
        albumIds.map(albumId =>
          queryClient.fetchQuery({
            queryKey: [QueryKeys.Album, albumId],
            queryFn: () => api.albums.get(albumId),
            staleTime: 5 * 60 * 1000,
          })
        )
      );

      const songs: Song[] = albums.flatMap(a => a?.songs ?? []);
      if (!songs.length) return;

      playSongInCollection(
        songs[0],
        {
          id: artist.id,
          title: artist.name,
          artist,
          cover: artist.cover,
          subtext: 'Artist',
          userPlayCount: 0,
          songs,
        },
        shuffle
      );
    },
    [fetchArtist, queryClient, api, playSongInCollection]
  );

  const handleShowInfo = useCallback(async () => {
    const artist = await fetchArtist();
    if (!artist) return;
    setArtistInfo(artist);
    setInfoVisible(true);
  }, [fetchArtist]);

  const infoRows: InfoRow[] = useMemo(() => {
    if (!artistInfo) return [];
    return [
      {
        id: 'albums',
        label: 'Albums',
        value: artistInfo.ownedAlbums.length,
      },
      {
        id: 'externalAlbums',
        label: 'External Albums',
        value: artistInfo.externalAlbums.length,
      },
    ];
  }, [artistInfo]);

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
      id: 'info',
      label: 'Artist Info',
      icon: 'information-circle',
      onPress: () => {
        setMenuVisible(false);
        handleShowInfo();
      },
    },
    {
      id: 'navigate',
      label: 'Go to Artist',
      icon: 'person',
      dividerBefore: true,
      onPress: handleNavigation,
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

        <View style={isGridView ? styles.gridTextContainer : styles.textContainer}>
          <Text
            style={[styles.title, isDarkMode && styles.titleDark]}
            numberOfLines={1}
          >
            {name}
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

      {artistInfo && (
        <InfoModal
          visible={infoVisible}
          onClose={() => {
            setInfoVisible(false);
            setArtistInfo(null);
          }}
          title={artistInfo.name}
          subtitle="Artist"
          cover={artistInfo.cover}
          rows={infoRows}
        />
      )}
    </>
  );
};

export default ArtistItem;

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