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
import { ChevronLeft, Ellipsis, Shuffle, Play, Check, Download } from 'lucide-react-native';
import TurboImage from 'react-native-turbo-image';
import { useSelector } from 'react-redux';
import { MediaImage } from '@/components/MediaImage';
import ArtistOptions from '@/components/options/ArtistOptions';
import { Artist, ExternalArtist, Song } from '@/types';
import { usePlaying } from '@/contexts/PlayingContext';
import { toast } from '@backpackapp-io/react-native-toast';
import { useArtistAlbums } from '@/hooks/artists';
import { useTracks } from '@/hooks/tracks';
import { buildCover } from '@/utils/builders/buildCover';
import { useTheme } from '@/hooks/useTheme';
import { useDownload } from '@/contexts/DownloadContext';
import { useSheetRef } from '@/utils/useSheetRef';
import { useApi } from '@/api';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { fetchAlbumDetailsSettled } from '@/hooks/albums';
import { DetailActionRow, DetailCircleAction, DetailPlayAction } from '@/components/DetailHeader';

type Props = {
  localArtist: Artist | null;
  externalArtist: ExternalArtist | null;
};

function isAlbumCountText(value?: string | null): boolean {
  return /^\s*\d+\s+albums?\s*$/i.test(value ?? '');
}

const ArtistHeader: React.FC<Props> = ({ localArtist, externalArtist }) => {
  const navigation = useNavigation<any>();
  const { isDarkMode, colors } = useTheme();

  const coverUri = localArtist
    ? buildCover(localArtist.cover, 'background')
    : buildCover(externalArtist!.cover, 'background');

  const displayName = localArtist?.name ?? externalArtist?.name ?? '';
  const displayCover = localArtist?.cover ?? externalArtist?.cover ?? { kind: 'none' as const };

  return (
    <>
      <View style={styles.fullBleedWrapper}>
        {coverUri ? (
          <TurboImage
            source={{ uri: coverUri }}
            style={[StyleSheet.absoluteFill, { left: -50, right: -50 }]}
            resizeMode="cover"
            blur={Platform.OS === 'ios' ? 20 : 10}
            fadeDuration={300}
            cachePolicy="dataCache"
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.muted },
            ]}
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
            cover={displayCover}
            size="detail"
            style={styles.centeredCover}
          />
        </View>

        <View style={styles.header}>
          <TouchableOpacity
            testID="detail-back-button"
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={24} color="#fff" style={{ marginLeft: -2 }} />
          </TouchableOpacity>
          {localArtist ? (
            <LocalOptionsButton artist={localArtist} />
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.content}>
          <Text
            style={[styles.artistName, { color: colors.secondary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {displayName}
          </Text>
          {localArtist ? (
            <LocalMetaRow artist={localArtist} />
          ) : (
            <ExternalMetaRow artist={externalArtist!} />
          )}
        </View>
      </View>

      {localArtist ? <LocalActionRow artist={localArtist} /> : null}
    </>
  );
};

function LocalOptionsButton({ artist }: { artist: Artist }) {
  const optionsSheetRef = useSheetRef();
  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Artist options"
        style={styles.backButton}
        onPress={() => optionsSheetRef.current?.present()}
      >
        <Ellipsis size={24} color="#fff" />
      </TouchableOpacity>
      <ArtistOptions ref={optionsSheetRef} artist={artist} hideGoToArtist />
    </>
  );
}

function LocalMetaRow({ artist }: { artist: Artist }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const artistAlbums = useArtistAlbums(artist.id);
  const { tracks: allTracks } = useTracks();
  const artistTrackIds = useMemo(
    () => allTracks.filter(track => track.artistId === artist.id).map(track => track.id),
    [allTracks, artist.id]
  );

  const metadataItems = useMemo(() => {
    const albumCount = artistAlbums.length;
    const songCount = artistTrackIds.length;
    const items = [`${albumCount} ${albumCount === 1 ? t('common.album') : t('common.albums')}`];
    if (songCount > 0) {
      items.push(`${songCount} ${songCount === 1 ? t('common.song') : t('common.songs')}`);
    }
    return items;
  }, [artistAlbums.length, artistTrackIds.length, t]);

  return (
    <View style={styles.metaRow}>
      {metadataItems.map((item, index) => (
        <React.Fragment key={`${item}-${index}`}>
          {index > 0 && <Text style={[styles.metaDot, { color: colors.subtext }]}>•</Text>}
          <Text style={[styles.metaText, { color: colors.subtext }]} numberOfLines={1}>
            {item}
          </Text>
        </React.Fragment>
      ))}
    </View>
  );
}

function ExternalMetaRow({ artist }: { artist: ExternalArtist }) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const metadataItems = useMemo(() => {
    const items: string[] = [];
    const albumCount = artist.albums?.length ?? 0;
    if (albumCount > 0) {
      items.push(`${albumCount} ${albumCount === 1 ? t('common.album') : t('common.albums')}`);
    }
    if (artist.subtext && !isAlbumCountText(artist.subtext)) items.push(artist.subtext);
    return items;
  }, [artist.albums?.length, artist.subtext, t]);

  return (
    <View style={styles.metaRow}>
      {metadataItems.map((item, index) => (
        <React.Fragment key={`${item}-${index}`}>
          {index > 0 && <Text style={[styles.metaDot, { color: colors.subtext }]}>•</Text>}
          <Text style={[styles.metaText, { color: colors.subtext }]} numberOfLines={1}>
            {item}
          </Text>
        </React.Fragment>
      ))}
    </View>
  );
}

function LocalActionRow({ artist }: { artist: Artist }) {
  const { t } = useTranslation();
  const { isDarkMode, colors } = useTheme();
  const queryClient = useQueryClient();
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);

  const { playSongInCollection } = usePlaying();
  const { downloadAlbumById, getCollectionDownloadState } = useDownload();
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [songsLoading, setSongsLoading] = useState(false);

  const artistAlbums = useArtistAlbums(artist.id);
  const { tracks: allTracks } = useTracks();
  const artistTrackIds = useMemo(
    () => allTracks.filter(track => track.artistId === artist.id).map(track => track.id),
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
    <DetailActionRow style={styles.buttonRow}>
      <DetailCircleAction
        onPress={() => void playArtist(true)}
        disabled={songsLoading}
        style={isDarkMode ? styles.secondaryButtonDark : styles.secondaryButton}
      >
        {songsLoading ? (
          <ActivityIndicator size="small" color={colors.secondary} />
        ) : (
          <Shuffle size={18} color={colors.secondary} />
        )}
      </DetailCircleAction>

      <DetailPlayAction
        onPress={() => void playArtist(false)}
        disabled={songsLoading}
      >
        {songsLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Play size={24} color="#fff" fill="#fff" />
        )}
      </DetailPlayAction>

      <DetailCircleAction
        onPress={() => void handleDownloadAll()}
        disabled={isDownloadingAll || isArtistDownloading}
        style={isDarkMode ? styles.secondaryButtonDark : styles.secondaryButton}
      >
        {isDownloadingAll || isArtistDownloading ? (
          <ActivityIndicator size="small" color={colors.secondary} />
        ) : isArtistFullyDownloaded ? (
          <Check size={18} color={colors.secondary} />
        ) : (
          <Download size={18} color={colors.secondary} />
        )}
      </DetailCircleAction>
    </DetailActionRow>
  );
}

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
    marginBottom: 24,
  },
  secondaryButton: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  secondaryButtonDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
