import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import TurboImage from 'react-native-turbo-image';
import { useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { MediaImage } from '@/components/MediaImage';
import ArtistOptions from '@/components/options/ArtistOptions';
import { Artist, Song, Album } from '@/types';
import { usePlaying } from '@/contexts/PlayingContext';
import { toast } from '@backpackapp-io/react-native-toast';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { buildCover } from '@/utils/builders/buildCover';
import { useTheme } from '@/hooks/useTheme';
import { staleTime } from '@/constants/staleTime';
import { useDownload } from '@/contexts/DownloadContext';
import { useSheetRef } from '@/utils/useSheetRef';

type Props = {
  artist: Artist;
};

const ArtistHeader: React.FC<Props> = ({ artist }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const activeServer = useSelector(selectActiveServer);

  const queryClient = useQueryClient();
  const api = useApi();
  const { playSongInCollection } = usePlaying();
  const { downloadAlbumById, getCollectionDownloadState } = useDownload();
  const optionsSheetRef = useSheetRef();

  const [artistSongs, setArtistSongs] = useState<Song[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const artistAlbumIdsKey = useMemo(
    () => artist.ownedAlbums.map(album => album.id).join(','),
    [artist.ownedAlbums]
  );

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
              queryKey: [QueryKeys.Album, activeServer?.id, a.id],
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
  }, [activeServer?.id, api.albums, artist.id, artist.ownedAlbums, artistAlbumIdsKey, queryClient]);

  const playArtist = (shuffle = false) => {
    if (!artistSongs.length) {
      toast.error(t('common.oneSecond'));
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
          subtext: t('common.artist'),
        },
        cover: artist.cover,
        songs: artistSongs,
        subtext: t('common.playlist'),
        changed: new Date('1995-12-17T03:24:00'),
        created: new Date('1995-12-17T03:24:00')
      },
      shuffle
    );
  };

  const metadataItems = useMemo(() => {
    const albumCount = artist.ownedAlbums.length;
    const songCount = artistSongs.length;
    const items = [`${albumCount} ${albumCount === 1 ? t('common.album') : t('common.albums')}`];
    if (!loadingSongs) {
      items.push(`${songCount} ${songCount === 1 ? t('common.song') : t('common.songs')}`);
    }
    return items;
  }, [artist.ownedAlbums.length, artistSongs.length, loadingSongs, t]);

  const {
    isDownloaded: isArtistFullyDownloaded,
    isDownloading: isArtistDownloading,
  } = getCollectionDownloadState(artistSongs.map((song) => song.id));

  const handleDownloadAll = async () => {
    if (
      isDownloadingAll ||
      isArtistDownloading ||
      isArtistFullyDownloaded ||
      !artist.ownedAlbums.length
    ) return;
    setIsDownloadingAll(true);
    try {
      for (const album of artist.ownedAlbums) {
        await downloadAlbumById(album.id);
      }
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <>
      <View style={styles.fullBleedWrapper}>
        {buildCover(artist.cover, 'background') && (
          <TurboImage
            source={{ uri: buildCover(artist.cover, 'background')! }}
            style={[StyleSheet.absoluteFill, { left: -50, right: -50 }]}
            resizeMode="cover"
            blur={Platform.OS === 'ios' ? 20 : 10}
            fadeDuration={300}
            cachePolicy="dataCache"
          />
        )}

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
            <Ionicons name="chevron-back" size={24} color="#fff" style={{ marginLeft: -2 }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => optionsSheetRef.current?.present()}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ArtistOptions
        ref={optionsSheetRef}
        artist={artist}
        hideGoToArtist
      />

      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.content}>
          <Text style={[styles.artistName, isDarkMode && styles.artistNameDark]}>
            {artist.name}
          </Text>
          <View style={styles.metaRow}>
            {metadataItems.map((item, index) => (
              <React.Fragment key={`${item}-${index}`}>
                {index > 0 && (
                  <Text style={[styles.metaDot, isDarkMode && styles.metaTextDark]}>•</Text>
                )}
                <Text
                  style={[styles.metaText, isDarkMode && styles.metaTextDark]}
                  numberOfLines={1}
                >
                  {item}
                </Text>
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={() => playArtist(true)}
          style={[styles.secondaryButton, isDarkMode && styles.secondaryButtonDark]}
        >
          <Ionicons name="shuffle" size={18} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => playArtist(false)}
          style={[styles.playButton, { backgroundColor: themeColor }]}
        >
          <Ionicons name="play" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            void handleDownloadAll();
          }}
          disabled={isDownloadingAll || isArtistDownloading}
          style={[styles.secondaryButton, isDarkMode && styles.secondaryButtonDark]}
        >
          {isDownloadingAll || isArtistDownloading ? (
            <ActivityIndicator size="small" color={isDarkMode ? '#fff' : '#000'} />
          ) : (
            <Ionicons
              name={isArtistFullyDownloaded ? 'checkmark' : 'download-outline'}
              size={18}
              color={isDarkMode ? '#fff' : '#000'}
            />
          )}
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
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  metaDot: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  metaTextDark: {
    color: '#aaa',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  secondaryButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  playButton: {
    borderRadius: 22,
    width: 112,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
