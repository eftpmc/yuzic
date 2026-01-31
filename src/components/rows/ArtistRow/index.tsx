import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/api';
import { Song, ArtistBase, Artist } from '@/types';
import { QueryKeys } from '@/enums/queryKeys';
import { MediaImage } from '@/components/MediaImage';
import ContextMenuModal, {
  ContextMenuAction,
} from '@/components/ContextMenuModal';
import InfoModal, { InfoRow } from '@/components/InfoModal';
import { useTheme } from '@/hooks/useTheme';
import { usePlaying } from '@/contexts/PlayingContext';
import { staleTime } from '@/constants/staleTime';

type Props = {
  artist: ArtistBase;
  onPress?: (artist: ArtistBase) => void;
};

const ArtistRow: React.FC<Props> = ({ artist, onPress }) => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const api = useApi();
  const { playSongInCollection } = usePlaying();

  const [menuVisible, setMenuVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [artistInfo, setArtistInfo] = useState<Artist | null>(null);

  const handleNavigation = useCallback(() => {
    navigation.navigate('artistView', { id: artist.id });
  }, [navigation, artist.id]);

  const fetchArtist = useCallback(async () => {
    return queryClient.fetchQuery({
      queryKey: [QueryKeys.Artist, artist.id],
      queryFn: () => api.artists.get(artist.id),
      staleTime: staleTime.artists,
    });
  }, [api, queryClient, artist.id]);

  const handlePlay = useCallback(
    async (shuffle: boolean) => {
      const fullArtist = await fetchArtist();
      if (!fullArtist) return;

      const albumIds = fullArtist.ownedAlbums.map(a => a.id);
      if (!albumIds.length) return;

      const albums = await Promise.all(
        albumIds.map(albumId =>
          queryClient.fetchQuery({
            queryKey: [QueryKeys.Album, albumId],
            queryFn: () => api.albums.get(albumId),
            staleTime: staleTime.albums,
          })
        )
      );

      const songs: Song[] = albums.flatMap(a => a?.songs ?? []);
      if (!songs.length) return;

      playSongInCollection(
        songs[0],
        {
          id: fullArtist.id,
          title: fullArtist.name,
          artist: fullArtist,
          cover: fullArtist.cover,
          subtext: 'Artist',
          changed: new Date('1995-12-17T03:24:00'),
          created: new Date('1995-12-17T03:24:00'),
          songs,
        },
        shuffle
      );
    },
    [fetchArtist, queryClient, api, playSongInCollection]
  );

  const handleShowInfo = useCallback(async () => {
    const fullArtist = await fetchArtist();
    if (!fullArtist) return;
    setArtistInfo(fullArtist);
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
    ];
  }, [artistInfo]);

  const menuActions: ContextMenuAction[] = useMemo(
    () => [
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
    ],
    [handlePlay, handleShowInfo, handleNavigation]
  );

  return (
    <>
      <View style={styles.wrapper}>
        <View style={styles.rowItem}>
          <TouchableOpacity
            style={styles.rowContent}
            onPress={() => onPress?.(artist)}
          >
            <MediaImage
              cover={artist.cover}
              size="grid"
              style={styles.cover}
            />

            <View style={styles.textContainer}>
              <Text
                numberOfLines={1}
                style={[
                  styles.title,
                  isDarkMode && styles.titleDark,
                ]}
              >
                {artist.name}
              </Text>

              <Text
                numberOfLines={1}
                style={[
                  styles.subtext,
                  isDarkMode && styles.subtextDark,
                ]}
              >
                {artist.subtext}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              style={styles.optionButton}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={24}
                color={isDarkMode ? '#fff' : '#000'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

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

export default ArtistRow;

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
  },
  cover: {
    width: 64,
    height: 64,
    borderRadius: 6,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  titleDark: {
    color: '#fff',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  subtextDark: {
    color: '#aaa',
  },
  optionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionButton: {
    padding: 8,
  },
});
