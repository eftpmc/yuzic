import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MediaImage } from '@/components/MediaImage';
import { Artist, Song, Album } from '@/types';
import { usePlaying } from '@/contexts/PlayingContext';
import { toast } from '@backpackapp-io/react-native-toast';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { selectLastfmConfig } from '@/utils/redux/selectors/lastfmSelectors';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { buildCover } from '@/utils/builders/buildCover';
import { useTheme } from '@/hooks/useTheme';
import { staleTime } from '@/constants/staleTime';
import * as lastfm from '@/api/lastfm';
import { Skeleton } from 'moti/skeleton';

type Props = {
  artist: Artist;
};

const ArtistHeader: React.FC<Props> = ({ artist }) => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const lastfmConfig = useSelector(selectLastfmConfig);

  const queryClient = useQueryClient();
  const api = useApi();
  const { playSongInCollection } = usePlaying();

  const [artistSongs, setArtistSongs] = useState<Song[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(true);

  const { data: lastfmData, isLoading: isLastfmLoading } = useQuery({
    queryKey: [QueryKeys.LastfmArtist, artist.name],
    queryFn: () =>
      lastfmConfig
        ? lastfm.getArtistInfo(lastfmConfig, artist.name)
        : null,
    staleTime: staleTime.lastfm,
    enabled: !!artist.name && !!lastfmConfig,
  });

  useEffect(() => {
    let cancelled = false;

    const loadSongs = async () => {
      setLoadingSongs(true);

      if (!artist.ownedAlbums.length) {
        setArtistSongs([]);
        setLoadingSongs(false);
        return;
      }

      try {
        const albums: Album[] = await Promise.all(
          artist.ownedAlbums.map(a =>
            queryClient.fetchQuery({
              queryKey: [QueryKeys.Album, a.id],
              queryFn: () => api.albums.get(a.id),
              staleTime: staleTime.albums,
            })
          )
        );

        if (cancelled) return;

        const songs = albums.flatMap(a => a.songs ?? []);
        setArtistSongs(songs);
      } catch {
        if (!cancelled) setArtistSongs([]);
      } finally {
        if (!cancelled) setLoadingSongs(false);
      }
    };

    loadSongs();

    return () => {
      cancelled = true;
    };
  }, [artist.id]);

  const playArtist = (shuffle = false) => {
    if (!artistSongs.length) {
      toast.error('One moment.');
      return;
    }

    playSongInCollection(
      artistSongs[0],
      {
        id: artist.id,
        title: artist.name,
        artist: {
          id: artist.id,
          name: artist.name,
          cover: artist.cover,
          subtext: 'Artist',
        },
        cover: artist.cover,
        songs: artistSongs,
        subtext: 'Playlist',
        changed: new Date('1995-12-17T03:24:00'),
        created: new Date('1995-12-17T03:24:00'),
        userPlayCount: 0,
      },
      shuffle
    );
  };

  const cleanBio =
    lastfmData?.bio
      ?.replace(/<[^>]*>/g, '')
      .replace(/Read more on Last\.fm\.?$/i, '')
      .trim() ?? '';

  return (
    <>
      <View style={styles.fullBleedWrapper}>
        <Image
          source={{ uri: buildCover(artist.cover, 'background') }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={Platform.OS === 'ios' ? 20 : 10}
          transition={300}
        />

        <LinearGradient
          colors={
            isDarkMode
              ? ['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,1)']
              : [
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.7)',
                'rgba(255,255,255,1)',
              ]
          }
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.centeredCoverContainer}>
          <MediaImage
            cover={artist.cover}
            size="detail"
            style={styles.centeredCover}
          />
        </View>

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.content}>
          <Text style={[styles.artistName, isDarkMode && styles.artistNameDark]}>
            {artist.name}
          </Text>

          {lastfmConfig && isLastfmLoading && (
            <View style={{ width: '100%', marginTop: 12 }}>
              <Skeleton
                height={14}
                width="90%"
                radius={4}
                colorMode={isDarkMode ? 'dark' : 'light'}
              />
              <View style={{ height: 8 }} />
              <Skeleton
                height={14}
                width="80%"
                radius={4}
                colorMode={isDarkMode ? 'dark' : 'light'}
              />
              <View style={{ height: 8 }} />
              <Skeleton
                height={14}
                width="60%"
                radius={4}
                colorMode={isDarkMode ? 'dark' : 'light'}
              />
            </View>
          )}

          {!lastfmConfig && (
            <Text
              style={[styles.artistBio, isDarkMode && styles.artistBioDark]}
            >
              Connect Last.fm in settings to see artist bio and external albums.
            </Text>
          )}

          {lastfmConfig && cleanBio.length > 0 && (
            <Text
              style={[styles.artistBio, isDarkMode && styles.artistBioDark]}
            >
              {cleanBio}{' '}
              {lastfmData?.artistUrl && (
                <Text
                  style={{ color: themeColor, fontWeight: '600' }}
                  onPress={() => Linking.openURL(lastfmData.artistUrl)}
                >
                  Read more on Last.fm
                </Text>
              )}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={() => playArtist(false)}
          style={[styles.button, isDarkMode && styles.buttonDark]}
        >
          <Ionicons name="play" size={18} color={themeColor} />
          <Text style={[styles.buttonText, isDarkMode && styles.buttonTextDark]}>
            Play
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => playArtist(true)}
          style={[styles.button, isDarkMode && styles.buttonDark]}
        >
          <Ionicons name="shuffle" size={18} color={themeColor} />
          <Text style={[styles.buttonText, isDarkMode && styles.buttonTextDark]}>
            Shuffle
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

export default ArtistHeader;

const styles = StyleSheet.create({
  fullBleedWrapper: {
    width: '100%',
    height: 300,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
  },
  centeredCoverContainer: {
    position: 'absolute',
    bottom: -32,
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredCover: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 20 : 50,
    left: 16,
    zIndex: 20,
  },
  backButton: {
    padding: 6,
  },
  content: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  artistName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  artistNameDark: {
    color: '#fff',
  },
  artistBio: {
    fontSize: 14,
    color: '#444',
    textAlign: 'left',
    marginTop: 12,
    lineHeight: 20,
  },
  artistBioDark: {
    color: '#ccc',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  buttonDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  buttonText: {
    marginLeft: 6,
    fontWeight: '600',
    color: '#000',
  },
  buttonTextDark: {
    color: '#fff',
  },
});