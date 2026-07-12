import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { ChevronLeft, Ellipsis, Shuffle, Play, Check, Download, CloudDownload, Link } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { Album, ExternalAlbum, Playlist, Song } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import AlbumOptions from '@/components/options/AlbumOptions';
import DownloadSheet from '@/components/options/DownloadSheet';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';

import { usePlayingActions } from '@/contexts/PlayingContext';
import { useDownload } from '@/contexts/DownloadContext';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';
import { useSheetRef } from '@/utils/useSheetRef';
import { formatDuration } from '@/utils/formatDuration';
import { useAnyDownloaderConnected } from '@/features/downloaders/registry';
import { useMatchedNavigation } from '@/features/sources/useMatchedNavigation';
import { useExternalAlbumPreviews } from '@/hooks/albums/useExternalAlbumPreviews';
import { useExternalAlbumStatus } from '@/hooks/useExternalAlbumStatus';
import { externalSongToTrack } from '@/hooks/usePreviewPlayer';

type Props = {
  localAlbum: Album | null;
  externalAlbum: ExternalAlbum | null;
};

function isCountLikeAlbumText(value?: string | null): boolean {
  return /^\s*\d+\s+albums?\s*$/i.test(value ?? '');
}

const AlbumHeader: React.FC<Props> = ({ localAlbum, externalAlbum }) => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const displayTitle = localAlbum?.title ?? externalAlbum?.title ?? '';
  const displayCover = localAlbum?.cover ?? externalAlbum?.cover ?? { kind: 'none' as const };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity testID="detail-back-button" onPress={() => navigation.goBack()} style={styles.headerButton}>
          <ChevronLeft size={24} color={colors.secondary} />
        </TouchableOpacity>

        <View pointerEvents="none" style={styles.headerTitleWrapper}>
          <Text style={[styles.headerTitle, { color: colors.secondary }]} numberOfLines={1}>
            {displayTitle}
          </Text>
        </View>

        {localAlbum ? <LocalOptionsButton album={localAlbum} /> : <View style={styles.headerButton} />}
      </View>

      <View style={styles.coverWrapper}>
        <MediaImage cover={displayCover} size="detail" style={styles.coverImage} />
      </View>

      <View style={styles.titleInfo}>
        <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={2}>
          {displayTitle}
        </Text>

        {localAlbum ? <LocalMetaRow album={localAlbum} /> : <ExternalMetaRow album={externalAlbum!} />}
      </View>

      {!localAlbum && <ExternalServerStatusRow album={externalAlbum!} />}

      {localAlbum ? <LocalActionRow album={localAlbum} /> : <ExternalActionRow album={externalAlbum!} />}
    </View>
  );
};

function LocalOptionsButton({ album }: { album: Album }) {
  const { colors } = useTheme();
  const optionsSheetRef = useSheetRef();
  return (
    <>
      <TouchableOpacity
        onPress={() => optionsSheetRef.current?.present()}
        style={styles.headerButton}
      >
        <Ellipsis size={24} color={colors.secondary} />
      </TouchableOpacity>
      <AlbumOptions ref={optionsSheetRef} album={album} hideGoToAlbum />
    </>
  );
}

function LocalMetaRow({ album }: { album: Album }) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const songs = useMemo(() => album.songs ?? [], [album.songs]);
  const totalDuration = useMemo(
    () => songs.reduce((sum, song) => sum + Number(song.duration), 0),
    [songs]
  );

  const metadataItems = useMemo(() => {
    const items: { label: string; type: 'artist' | 'genre' | 'info' }[] = [];
    if (album.artist?.name) items.push({ label: album.artist.name, type: 'artist' });
    const genre = album.genres?.[0]?.trim();
    if (genre) items.push({ label: genre, type: 'genre' });
    const year = Number(album.year);
    if (Number.isFinite(year) && year > 0) items.push({ label: String(year), type: 'info' });
    if (!items.length) {
      items.push({ label: `${songs.length} songs`, type: 'info' });
      items.push({ label: formatDuration(totalDuration), type: 'info' });
    }
    return items;
  }, [album.artist?.name, album.genres, album.year, songs.length, totalDuration]);

  const handleGenrePress = useCallback((genre: string) => {
    navigation.push('genreView', { genre });
  }, [navigation]);

  return (
    <View style={styles.metaRow}>
      {metadataItems.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          {index > 0 && (
            <Text style={[styles.metaDot, { color: colors.subtext }]} numberOfLines={1}>
              •
            </Text>
          )}
          {item.type === 'artist' && album.artist ? (
            <TouchableOpacity onPress={() => navigation.push('artistView', { id: album.artist.id })}>
              <Text style={[styles.subtext, { color: colors.subtext }]} numberOfLines={1}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ) : item.type === 'genre' ? (
            <TouchableOpacity onPress={() => handleGenrePress(item.label)}>
              <Text style={[styles.subtext, { color: colors.subtext }]} numberOfLines={1}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.subtext, { color: colors.subtext }]} numberOfLines={1}>
              {item.label}
            </Text>
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

function ExternalMetaRow({ album }: { album: ExternalAlbum }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { navigateToArtist } = useMatchedNavigation();

  const songs = useMemo(() => album.songs ?? [], [album.songs]);

  const metadataItems = useMemo(() => {
    const items: string[] = [];
    if (album.artist && !isCountLikeAlbumText(album.artist)) items.push(album.artist);
    if (songs.length > 0) items.push(t('externalAlbum.header.songs', { count: songs.length }));
    return [...new Set(items.map(item => item.trim()).filter(Boolean))];
  }, [album.artist, songs.length, t]);

  return (
    <View style={styles.metaRow}>
      {metadataItems.map((item, index) => (
        <React.Fragment key={`${item}-${index}`}>
          {index > 0 && <Text style={[styles.metaDot, { color: colors.subtext }]}>•</Text>}
          {index === 0 && album.artist ? (
            <TouchableOpacity
              onPress={() =>
                navigateToArtist({
                  id: album.externalIds?.artistDeezerId ?? '',
                  name: album.artist,
                  cover: { kind: 'none' },
                  subtext: '',
                  externalSource: album.externalSource,
                  externalIds: { deezerId: album.externalIds?.artistDeezerId, mbid: album.artistMbid },
                })
              }
            >
              <Text style={[styles.subtext, { color: colors.subtext }]} numberOfLines={1}>
                {item}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.subtext, { color: colors.subtext }]} numberOfLines={1}>
              {item}
            </Text>
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

function ExternalServerStatusRow({ album }: { album: ExternalAlbum }) {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const albumStatus = useExternalAlbumStatus(album);

  if (albumStatus.kind === 'none') return null;

  const serverStatusBg = isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';

  return (
    <View style={[styles.serverStatusRow, { backgroundColor: serverStatusBg }]}>
      {albumStatus.kind === 'in_library' ? (
        <>
          <Link size={14} color="#34C759" />
          <Text style={[styles.serverStatusText, { color: '#34C759' }]}>
            {t('externalAlbum.serverStatus.onServer')}
          </Text>
        </>
      ) : (
        <>
          <SpinningLoaderCircle size={14} color="#007AFF" />
          <Text style={[styles.serverStatusText, { color: '#007AFF' }]}>
            {t('externalAlbum.serverStatus.downloadingToServer', { progress: albumStatus.progress })}
          </Text>
        </>
      )}
    </View>
  );
}

function LocalActionRow({ album }: { album: Album }) {
  const { colors } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const { playSongInCollection } = usePlayingActions();
  const { downloadAlbumById, getCollectionDownloadState } = useDownload();

  const songs = useMemo(() => album.songs ?? [], [album.songs]);
  const songIds = useMemo(() => songs.map(s => s.id), [songs]);
  const { isDownloaded: isAlbumDownloaded, isDownloading: isAlbumDownloading } =
    getCollectionDownloadState(songIds);

  const checkmarkScale = useSharedValue(isAlbumDownloaded ? 1 : 0);

  useEffect(() => {
    if (isAlbumDownloaded) {
      checkmarkScale.value = withSequence(
        withSpring(1.2, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
    } else {
      checkmarkScale.value = 0;
    }
  }, [isAlbumDownloaded, checkmarkScale]);

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
  }));

  const toggleDownload = useCallback(async () => {
    if (!songs.length || isAlbumDownloading || isAlbumDownloaded) return;
    await downloadAlbumById(album.id, songs);
  }, [songs, isAlbumDownloading, isAlbumDownloaded, downloadAlbumById, album.id]);

  const handlePlay = useCallback(() => {
    if (songs.length > 0) playSongInCollection(songs[0], album, false);
  }, [songs, album, playSongInCollection]);

  const handleShuffle = useCallback(() => {
    if (songs.length > 0) playSongInCollection(songs[0], album, true);
  }, [songs, album, playSongInCollection]);

  return (
    <View style={styles.actionsRow}>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: colors.card }]}
          onPress={handleShuffle}
        >
          <Shuffle size={18} color={colors.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: themeColor }]}
          onPress={handlePlay}
        >
          <Play size={20} color="#fff" fill="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: colors.card }]}
          onPress={() => void toggleDownload()}
          disabled={isAlbumDownloading}
        >
          {isAlbumDownloading ? (
            <ActivityIndicator size="small" color={colors.secondary} />
          ) : isAlbumDownloaded ? (
            <Animated.View style={checkmarkStyle}>
              <Check size={18} color={colors.secondary} />
            </Animated.View>
          ) : (
            <Download size={18} color={colors.secondary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ExternalActionRow({ album }: { album: ExternalAlbum }) {
  const { colors } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const canDownload = useAnyDownloaderConnected();
  const { playSongInCollection } = usePlayingActions();
  const albumStatus = useExternalAlbumStatus(album);
  const previews = useExternalAlbumPreviews(album);
  const downloadSheetRef = useSheetRef();

  const songs = useMemo(() => album.songs ?? [], [album.songs]);

  const previewSongs = useMemo<Song[]>(
    () => songs.filter(s => !!previews[s.id]).map(s => externalSongToTrack(s, previews[s.id])),
    [songs, previews]
  );

  const previewCollection = useMemo<Playlist>(() => ({
    id: `preview-${album.id}`,
    title: album.title,
    subtext: album.artist,
    cover: album.cover,
    changed: new Date(),
    created: new Date(),
    songs: previewSongs,
  }), [album, previewSongs]);

  const handlePlay = useCallback(() => {
    if (!previewSongs.length) return;
    playSongInCollection(previewSongs[0], previewCollection);
  }, [previewSongs, previewCollection, playSongInCollection]);

  const handleDownload = useCallback(() => {
    if (!canDownload || albumStatus.kind !== 'none') return;
    downloadSheetRef.current?.present();
  }, [canDownload, albumStatus.kind, downloadSheetRef]);

  return (
    <>
      <View style={styles.actionsRow}>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: themeColor }]}
            onPress={handleDownload}
            disabled={!canDownload || albumStatus.kind !== 'none'}
          >
            <CloudDownload
              size={20}
              color={!canDownload || albumStatus.kind !== 'none' ? 'rgba(255,255,255,0.4)' : '#fff'}
            />
          </TouchableOpacity>

          {previewSongs.length > 0 && (
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.card }]}
              onPress={handlePlay}
            >
              <Play size={18} color={colors.secondary} fill={colors.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <DownloadSheet album={album} sheetRef={downloadSheetRef} />
    </>
  );
}

export default AlbumHeader;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  headerTitleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    maxWidth: '60%',
  },
  headerButton: {
    padding: 6,
    width: 36,
  },
  coverWrapper: {
    width: 280,
    height: 280,
    borderRadius: 16,
    marginTop: 32,
    marginBottom: 24,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  titleInfo: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
  },
  metaDot: {
    fontSize: 14,
    marginHorizontal: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    flexWrap: 'nowrap',
    maxWidth: '94%',
    marginTop: 4,
  },
  actionsRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    borderRadius: 22,
    width: 112,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serverStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 10,
  },
  serverStatusText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
