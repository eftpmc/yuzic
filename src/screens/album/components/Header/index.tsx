import React, { useCallback, useEffect, useMemo } from 'react';
import { statusColor } from '@/constants/design';
import {
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { Ellipsis, Shuffle, Play, Check, Download, CloudDownload, Link } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { Album, ExternalAlbum, Playlist, Song } from '@/types';
import AlbumOptions from '@/components/options/AlbumOptions';
import DownloadSheet from '@/components/options/DownloadSheet';
import StatusBanner from '@/components/StatusBanner';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import DownloadProgressRing from '@/components/DownloadProgressRing';
import { useCollectionDownloadProgress } from '@/hooks/useCollectionDownloadProgress';

import { usePlayingActions } from '@/contexts/PlayingContext';
import { useDownload } from '@/contexts/DownloadContext';
import { useTheme } from '@/hooks/useTheme';
import { useSheetRef } from '@/utils/useSheetRef';
import { formatDuration } from '@/utils/formatDuration';
import { useAnyDownloaderConnected } from '@/features/downloaders/registry';
import { useMatchedNavigation } from '@/features/sources/useMatchedNavigation';
import { useExternalAlbumPreviews } from '@/hooks/albums/useExternalAlbumPreviews';
import { useExternalAlbumStatus } from '@/hooks/useExternalAlbumStatus';
import { externalSongToTrack } from '@/hooks/usePreviewPlayer';
import {
  DetailActionRow,
  DetailCircleAction,
  DetailHeader,
  DetailHeaderIconButton,
  DetailMetaDot,
  DetailMetaRow,
  DetailMetaText,
  DetailPlayAction,
} from '@/components/DetailHeader';

type Props = {
  localAlbum: Album | null;
  externalAlbum: ExternalAlbum | null;
};

function isCountLikeAlbumText(value?: string | null): boolean {
  return /^\s*\d+\s+albums?\s*$/i.test(value ?? '');
}

const AlbumHeader: React.FC<Props> = ({ localAlbum, externalAlbum }) => {
  const displayTitle = localAlbum?.title ?? externalAlbum?.title ?? '';
  const displayCover = localAlbum?.cover ?? externalAlbum?.cover ?? { kind: 'none' as const };

  return (
    <DetailHeader
      title={displayTitle}
      cover={displayCover}
      rightAction={localAlbum ? <LocalOptionsButton album={localAlbum} /> : undefined}
      meta={localAlbum ? <LocalMetaRow album={localAlbum} /> : <ExternalMetaRow album={externalAlbum!} />}
      status={!localAlbum ? <ExternalServerStatusRow album={externalAlbum!} /> : undefined}
      actions={localAlbum ? <LocalActionRow album={localAlbum} /> : <ExternalActionRow album={externalAlbum!} />}
    />
  );
};

function LocalOptionsButton({ album }: { album: Album }) {
  const { colors } = useTheme();
  const optionsSheetRef = useSheetRef();
  return (
    <>
      <DetailHeaderIconButton
        onPress={() => optionsSheetRef.current?.present()}
      >
        <Ellipsis size={24} color={colors.secondary} />
      </DetailHeaderIconButton>
      <AlbumOptions ref={optionsSheetRef} album={album} hideGoToAlbum />
    </>
  );
}

function LocalMetaRow({ album }: { album: Album }) {
  const navigation = useNavigation<any>();

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
    <DetailMetaRow>
      {metadataItems.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          {index > 0 && <DetailMetaDot />}
          {item.type === 'artist' && album.artist ? (
            <TouchableOpacity onPress={() => navigation.push('artistView', { id: album.artist.id })}>
              <DetailMetaText>{item.label}</DetailMetaText>
            </TouchableOpacity>
          ) : item.type === 'genre' ? (
            <TouchableOpacity onPress={() => handleGenrePress(item.label)}>
              <DetailMetaText>{item.label}</DetailMetaText>
            </TouchableOpacity>
          ) : (
            <DetailMetaText>{item.label}</DetailMetaText>
          )}
        </React.Fragment>
      ))}
    </DetailMetaRow>
  );
}

function ExternalMetaRow({ album }: { album: ExternalAlbum }) {
  const { t } = useTranslation();
  const { navigateToArtist } = useMatchedNavigation();

  const songs = useMemo(() => album.songs ?? [], [album.songs]);

  const metadataItems = useMemo(() => {
    const items: string[] = [];
    if (album.artist && !isCountLikeAlbumText(album.artist)) items.push(album.artist);
    if (songs.length > 0) items.push(t('externalAlbum.header.songs', { count: songs.length }));
    return [...new Set(items.map(item => item.trim()).filter(Boolean))];
  }, [album.artist, songs.length, t]);

  return (
    <DetailMetaRow>
      {metadataItems.map((item, index) => (
        <React.Fragment key={`${item}-${index}`}>
          {index > 0 && <DetailMetaDot />}
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
              <DetailMetaText>{item}</DetailMetaText>
            </TouchableOpacity>
          ) : (
            <DetailMetaText>{item}</DetailMetaText>
          )}
        </React.Fragment>
      ))}
    </DetailMetaRow>
  );
}

function ExternalServerStatusRow({ album }: { album: ExternalAlbum }) {
  const { t } = useTranslation();
  const albumStatus = useExternalAlbumStatus(album);

  if (albumStatus.kind === 'none') return null;

  if (albumStatus.kind === 'in_library') {
    return (
      <StatusBanner
        icon={<Link size={14} color={statusColor.success} />}
        text={t('externalAlbum.serverStatus.onServer')}
        color={statusColor.success}
        style={styles.serverStatusRow}
      />
    );
  }
  return (
    <StatusBanner
      icon={<SpinningLoaderCircle size={14} color={statusColor.downloading} />}
      text={t('externalAlbum.serverStatus.downloadingToServer', { progress: albumStatus.progress })}
      color={statusColor.downloading}
      style={styles.serverStatusRow}
    />
  );
}

function LocalActionRow({ album }: { album: Album }) {
  const { colors } = useTheme();
  const { playSongInCollection } = usePlayingActions();
  const { downloadAlbumById, cancelCollectionDownloads, getCollectionDownloadState } = useDownload();

  const songs = useMemo(() => album.songs ?? [], [album.songs]);
  const songIds = useMemo(() => songs.map(s => s.id), [songs]);
  const { isDownloaded: isAlbumDownloaded, isDownloading: isAlbumDownloading } =
    getCollectionDownloadState(songIds);
  const downloadFraction = useCollectionDownloadProgress(songIds);

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
    if (isAlbumDownloading) {
      await cancelCollectionDownloads(album.id);
      return;
    }
    if (!songs.length || isAlbumDownloaded) return;
    await downloadAlbumById(album.id, songs);
  }, [songs, isAlbumDownloading, isAlbumDownloaded, downloadAlbumById, cancelCollectionDownloads, album.id]);

  const handlePlay = useCallback(() => {
    if (songs.length > 0) playSongInCollection(songs[0], album, false);
  }, [songs, album, playSongInCollection]);

  const handleShuffle = useCallback(() => {
    if (songs.length > 0) playSongInCollection(songs[0], album, true);
  }, [songs, album, playSongInCollection]);

  return (
    <DetailActionRow>
      <DetailCircleAction onPress={handleShuffle}>
        <Shuffle size={18} color={colors.secondary} />
      </DetailCircleAction>

      <DetailPlayAction onPress={handlePlay}>
        <Play size={20} color="#fff" fill="#fff" />
      </DetailPlayAction>

      <DetailCircleAction onPress={() => void toggleDownload()}>
        {isAlbumDownloading ? (
          <DownloadProgressRing progress={downloadFraction} size={18} />
        ) : isAlbumDownloaded ? (
          <Animated.View style={checkmarkStyle}>
            <Check size={18} color={colors.secondary} />
          </Animated.View>
        ) : (
          <Download size={18} color={colors.secondary} />
        )}
      </DetailCircleAction>
    </DetailActionRow>
  );
}

function ExternalActionRow({ album }: { album: ExternalAlbum }) {
  const { colors } = useTheme();
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
      <DetailActionRow>
        <DetailPlayAction
          onPress={handleDownload}
          disabled={!canDownload || albumStatus.kind !== 'none'}
        >
          <CloudDownload
            size={20}
            color={!canDownload || albumStatus.kind !== 'none' ? 'rgba(255,255,255,0.4)' : '#fff'}
          />
        </DetailPlayAction>

        {previewSongs.length > 0 && (
          <DetailCircleAction onPress={handlePlay}>
            <Play size={18} color={colors.secondary} fill={colors.secondary} />
          </DetailCircleAction>
        )}
      </DetailActionRow>

      <DownloadSheet album={album} sheetRef={downloadSheetRef} />
    </>
  );
}

export default AlbumHeader;

const styles = StyleSheet.create({
  serverStatusRow: {
    marginBottom: 10,
  },
});
