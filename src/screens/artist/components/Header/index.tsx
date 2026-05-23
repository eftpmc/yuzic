import React, { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { ChevronLeft, Ellipsis, Shuffle, Play, Check, Download, CheckCircle, ArrowDownCircle } from 'lucide-react-native';
import TurboImage from 'react-native-turbo-image';
import { useSelector } from 'react-redux';
import { MediaImage } from '@/components/MediaImage';
import ArtistOptions from '@/components/options/ArtistOptions';
import { Artist, Song } from '@/types';
import { usePlaying } from '@/contexts/PlayingContext';
import { toast } from '@backpackapp-io/react-native-toast';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useArtistAlbums } from '@/hooks/artists';
import { useTracks } from '@/hooks/tracks';
import { buildCover } from '@/utils/builders/buildCover';
import { useTheme } from '@/hooks/useTheme';
import { useDownload } from '@/contexts/DownloadContext';
import { useSheetRef } from '@/utils/useSheetRef';
import { useApi } from '@/api';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { fetchAlbumDetailsSettled } from '@/hooks/albums';

type Props = {
  artist: Artist;
};

const ArtistHeader: React.FC<Props> = ({ artist }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const api = useApi();
  const { isDarkMode, colors } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const activeServer = useSelector(selectActiveServer);

  const { playSongInCollection } = usePlaying();
  const { downloadAlbumById, getCollectionDownloadState } = useDownload();
  const optionsSheetRef = useSheetRef();
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [songsLoading, setSongsLoading] = useState(false);

  const artistAlbums = useArtistAlbums(artist.id);
  const { tracks: allTracks } = useTracks();
  const artistTrackIds = useMemo(
    () => allTracks
      .filter(track => track.artistId === artist.id)
      .map(track => track.id),
    [allTracks, artist.id]
  );

  const fetchArtistSongs = useCallback(async (): Promise<Song[]> => {
    if (!activeServer?.id || !artistAlbums.length) return [];

    const fullAlbums = await fetchAlbumDetailsSettled({
      queryClient,
      serverId: activeServer.id,
      albums: artistAlbums,
      getAlbum: api.albums.get,
    });

    return fullAlbums.flatMap(a => a.songs ?? []);
  }, [queryClient, activeServer, artistAlbums, api.albums.get]);

  const playArtist = useCallback(async (shuffle = false) => {
    if (songsLoading) return;

    const songs = await (async () => {
      setSongsLoading(true);
      try {
        return await fetchArtistSongs();
      } catch {
        return [];
      } finally {
        setSongsLoading(false);
      }
    })();

    if (!songs.length) {
      toast.error(t('common.oneSecond'));
      return;
    }

    playSongInCollection(
      songs[0],
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
        songs,
        subtext: t('common.playlist'),
        changed: new Date('1995-12-17T03:24:00'),
        created: new Date('1995-12-17T03:24:00')
      },
      shuffle
    );
  }, [songsLoading, fetchArtistSongs, playSongInCollection, artist, t]);

  const metadataItems = useMemo(() => {
    const albumCount = artistAlbums.length;
    const songCount = artistTrackIds.length;
    const items = [`${albumCount} ${albumCount === 1 ? t('common.album') : t('common.albums')}`];
    if (songCount > 0) {
      items.push(`${songCount} ${songCount === 1 ? t('common.song') : t('common.songs')}`);
    }
    return items;
  }, [artistAlbums.length, artistTrackIds.length, t]);

  const {
    isDownloaded: isArtistFullyDownloaded,
    isDownloading: isArtistDownloading,
  } = getCollectionDownloadState(artistTrackIds);

  const handleDownloadAll = useCallback(async () => {
    if (isDownloadingAll || isArtistDownloading || isArtistFullyDownloaded || !artistAlbums.length) return;
    setIsDownloadingAll(true);
    try {
      for (const album of artistAlbums) {
        await downloadAlbumById(album.id);
      }
    } finally {
      setIsDownloadingAll(false);
    }
  }, [isDownloadingAll, isArtistDownloading, isArtistFullyDownloaded, artistAlbums, downloadAlbumById]);

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
            <ChevronLeft size={24} color="#fff" style={{ marginLeft: -2 }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => optionsSheetRef.current?.present()}
          >
            <Ellipsis size={24} color="#fff" />
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
          <Text
            style={[styles.artistName, { color: colors.secondary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {artist.name}
          </Text>
          <View style={styles.metaRow}>
            {metadataItems.map((item, index) => (
              <React.Fragment key={`${item}-${index}`}>
                {index > 0 && (
                  <Text style={[styles.metaDot, { color: colors.subtext }]}>•</Text>
                )}
                <Text
                  style={[styles.metaText, { color: colors.subtext }]}
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
          onPress={() => void playArtist(true)}
          disabled={songsLoading}
          style={[styles.secondaryButton, isDarkMode && styles.secondaryButtonDark]}
        >
          {songsLoading ? (
            <ActivityIndicator size="small" color={colors.secondary} />
          ) : (
            <Shuffle size={18} color={colors.secondary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => void playArtist(false)}
          disabled={songsLoading}
          style={[styles.playButton, { backgroundColor: themeColor }]}
        >
          {songsLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Play size={24} color="#fff" fill="#fff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => void handleDownloadAll()}
          disabled={isDownloadingAll || isArtistDownloading}
          style={[styles.secondaryButton, isDarkMode && styles.secondaryButtonDark]}
        >
          {isDownloadingAll || isArtistDownloading ? (
            <ActivityIndicator size="small" color={colors.secondary} />
          ) : isArtistFullyDownloaded ? (
            <Check size={18} color={colors.secondary} />
          ) : (
            <Download size={18} color={colors.secondary} />
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
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
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
    marginHorizontal: 6,
  },
  metaText: {
    fontSize: 14,
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
