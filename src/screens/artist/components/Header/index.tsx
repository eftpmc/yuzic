import React, { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Ellipsis, Shuffle, Play, Check, Download } from 'lucide-react-native';
import TurboImage from 'react-native-turbo-image';
import { useSelector } from 'react-redux';
import { MediaImage } from '@/components/MediaImage';
import ArtistOptions from '@/components/options/ArtistOptions';
import { Artist, ExternalArtist, Song } from '@/types';
import { usePlayingActions } from '@/contexts/PlayingContext';
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
import {
  DetailActionRow,
  DetailCircleAction,
  DetailPlayAction,
  DetailHeaderBar,
  DetailHeaderIconButton,
  useDetailHeaderInset,
  useDetailHeroTitleLayout,
} from '@/components/DetailHeader';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import Touchable from '@/components/Touchable';
import { hitSlopFor, iconSize, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

type Props = {
  localArtist: Artist | null;
  externalArtist: ExternalArtist | null;
  showNavigation?: boolean;
};

function isAlbumCountText(value?: string | null): boolean {
  return /^\s*\d+\s+albums?\s*$/i.test(value ?? '');
}

const ArtistHeader: React.FC<Props> = ({ localArtist, externalArtist, showNavigation = true }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { isDarkMode, colors } = useTheme();
  const rad = useRadius();
  // The bar floats over this art now, so the wrapper grows by exactly the room
  // it and the status bar take: the cover stays where it was against the
  // content below, and the extra strip is filled with art rather than a band.
  const barInset = useDetailHeaderInset();
  const onTitleLayout = useDetailHeroTitleLayout();

  const coverUri = localArtist
    ? buildCover(localArtist.cover, 'background')
    : buildCover(externalArtist!.cover, 'background');

  const displayName = localArtist?.name ?? externalArtist?.name ?? '';
  const displayCover = localArtist?.cover ?? externalArtist?.cover ?? { kind: 'none' as const };

  return (
    <>
      <View style={[styles.fullBleedWrapper, { height: ARTIST_HERO_HEIGHT + barInset }]}>
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

        <View style={[styles.centeredCoverContainer, { borderRadius: rad.pill }]}>
          <MediaImage
            cover={displayCover}
            size="detail"
            style={[styles.centeredCover, { borderRadius: rad.pill }]}
          />
        </View>

        {showNavigation && (
          <View style={styles.header}>
            <Touchable
              testID="detail-back-button"
              accessibilityRole="button"
              accessibilityLabel={t('a11y.common.back')}
              style={[styles.backButton, { borderRadius: rad.md }]}
              hitSlop={hitSlopFor(36)}
              onPress={() => navigation.goBack()}
            >
              <ChevronLeft size={iconSize.header} color="#fff" style={{ marginLeft: -2 }} />
            </Touchable>
            {localArtist ? (
              <LocalOptionsButton artist={localArtist} />
            ) : (
              <View style={{ width: 36 }} />
            )}
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: spacing.lg }} onLayout={onTitleLayout}>
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

export const ArtistHeaderBar: React.FC<Props> = ({ localArtist, externalArtist }) => {
  const displayName = localArtist?.name ?? externalArtist?.name ?? '';
  return (
    <DetailHeaderBar
      title={displayName}
      rightAction={localArtist ? <LocalOptionsButton artist={localArtist} /> : undefined}
    />
  );
};

function LocalOptionsButton({ artist }: { artist: Artist }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const optionsSheetRef = useSheetRef();
  return (
    <>
      <DetailHeaderIconButton
        accessibilityLabel={t('a11y.common.moreOptions')}
        onPress={() => optionsSheetRef.current?.present()}
      >
        <Ellipsis size={iconSize.header} color={colors.secondary} />
      </DetailHeaderIconButton>
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

  const { playSongInCollection } = usePlayingActions();
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
      await Promise.all(artistAlbums.map(album => downloadAlbumById(album.id)));
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
        accessibilityLabel={t('a11y.detail.shuffle')}
      >
        {songsLoading ? (
          <SpinningLoaderCircle size={iconSize.row} color={colors.secondary} />
        ) : (
          <Shuffle size={iconSize.row} color={colors.secondary} />
        )}
      </DetailCircleAction>

      <DetailPlayAction
        onPress={() => void playArtist(false)}
        disabled={songsLoading}
        accessibilityLabel={t('a11y.detail.play')}
      >
        {songsLoading ? (
          <SpinningLoaderCircle size={iconSize.row} color={colors.onThemeColor} />
        ) : (
          <Play size={iconSize.header} color={colors.onThemeColor} fill={colors.onThemeColor} />
        )}
      </DetailPlayAction>

      <DetailCircleAction
        onPress={() => void handleDownloadAll()}
        disabled={isDownloadingAll || isArtistDownloading}
        style={isDarkMode ? styles.secondaryButtonDark : styles.secondaryButton}
        accessibilityLabel={t(
          isDownloadingAll || isArtistDownloading
            ? 'a11y.detail.downloading'
            : isArtistFullyDownloaded
              ? 'a11y.detail.downloaded'
              : 'a11y.detail.download'
        )}
      >
        {isDownloadingAll || isArtistDownloading ? (
          <SpinningLoaderCircle size={iconSize.row} color={colors.secondary} />
        ) : isArtistFullyDownloaded ? (
          <Check size={iconSize.row} color={colors.secondary} />
        ) : (
          <Download size={iconSize.row} color={colors.secondary} />
        )}
      </DetailCircleAction>
    </DetailActionRow>
  );
}

export default ArtistHeader;

/** The blurred cover behind an artist's name, before the floating bar's inset. */
const ARTIST_HERO_HEIGHT = 300;

const styles = StyleSheet.create({
  fullBleedWrapper: {
    width: '100%',
    height: ARTIST_HERO_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
  },
  centeredCoverContainer: {
    position: 'absolute',
    bottom: -32,
    width: 120,
    height: 120,
    overflow: 'hidden',
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredCover: {
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 20 : 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    zIndex: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  artistName: {
    ...typography.display,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.tight,
    flexWrap: 'wrap',
  },
  metaDot: {
    ...typography.rowSubtitle,
    marginHorizontal: spacing.tight,
  },
  metaText: {
    ...typography.rowSubtitle,
  },
  buttonRow: {
    marginBottom: spacing.xl,
  },
  secondaryButton: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  secondaryButtonDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
