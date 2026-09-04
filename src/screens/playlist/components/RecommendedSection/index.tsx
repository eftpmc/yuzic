import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { CheckCircle, CirclePlus, RefreshCw, CloudDownload } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@backpackapp-io/react-native-toast';

import { useTheme } from '@/hooks/useTheme';
import IconActionButton from '@/components/IconActionButton';
import MediaListRow from '@/components/MediaListRow';
import SectionHeader from '@/components/SectionHeader';
import { usePlayingActions } from '@/contexts/PlayingContext';
import { createAudiomuseQueueFillProvider } from '@/contexts/queueProviders';
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer';
import { useApi } from '@/api';
import {
  selectShowSourceHeaders,
  selectDeezerDiscoveryEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import {
  selectIsAudiomuseConfigured,
  selectAudiomuseConfig,
} from '@/utils/redux/selectors/audiomuseSelectors';
import { useAddSongToPlaylist } from '@/hooks/playlists';
import { useTracks } from '@/hooks/tracks';
import { usePlayableSongResolver } from '@/hooks/songs';
import { useIsOffline } from '@/hooks/useIsOffline';
import { useSheetRef } from '@/utils/useSheetRef';
import * as deezer from '@/api/deezer';
import { getLastFmSimilarArtists } from '@/api/lastfm/getSimilarArtists';
import { LASTFM_API_KEY } from '@/constants/keys';
import { QueryKeys } from '@/enums/queryKeys';
import DownloadSheet from '@/components/options/DownloadSheet';
import { useAnyDownloaderConnected } from '@/features/downloaders/registry';
import { formatSongDuration } from '@/utils/formatDuration';
import type { Playlist, SongBase, ExternalAlbumBase, ExternalSong } from '@/types';

import shuffleArray from '@/utils/shuffleArray';
import seededShuffle from '@/utils/seededShuffle';
import SkeletonListRow from '@/components/SkeletonListRow';
import Touchable from '@/components/Touchable';
import { sourceColor, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

const LOCAL_COUNT = 8;
const EXTERNAL_COUNT = 8;

async function fetchExternalRecs(artistNames: string[]): Promise<ExternalSong[]> {
  if (!artistNames.length || !LASTFM_API_KEY) return [];

  try {
    const similarResults = await Promise.all(
      artistNames.map(name => getLastFmSimilarArtists(LASTFM_API_KEY, name, 15))
    );

    const seen = new Set<string>(artistNames.map(n => n.toLowerCase()));
    const candidates: string[] = [];
    for (const similar of similarResults) {
      for (const s of shuffleArray(similar)) {
        if (candidates.length >= artistNames.length * 8) break;
        const key = s.name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          candidates.push(s.name);
        }
      }
    }

    const shuffledCandidates = shuffleArray(candidates);
    const trackGroupResults = await Promise.allSettled(
      shuffledCandidates.map(async name => {
        const artist = await deezer.resolveDeezerArtistByName(name);
        if (!artist) return [] as ExternalSong[];
        return deezer.getDeezerArtistTopTracks(artist.id, 2);
      })
    );
    const trackGroups = trackGroupResults
      .filter((r): r is PromiseFulfilledResult<ExternalSong[]> => r.status === 'fulfilled')
      .map(r => r.value);

    const seenIds = new Set<string>();
    const tracks: ExternalSong[] = [];
    const groups = shuffleArray(trackGroups.filter(group => group.length > 0));

    for (let trackIndex = 0; trackIndex < 2; trackIndex++) {
      for (const group of groups) {
        if (tracks.length >= EXTERNAL_COUNT) break;
        const track = group[trackIndex];
        if (!track) continue;
        if (!seenIds.has(track.id)) {
          seenIds.add(track.id);
          tracks.push(track);
        }
      }
      if (tracks.length >= EXTERNAL_COUNT) break;
    }

    for (const group of groups) {
      if (tracks.length >= EXTERNAL_COUNT) break;
      for (const track of group) {
        if (tracks.length >= EXTERNAL_COUNT) break;
        if (!seenIds.has(track.id)) {
          seenIds.add(track.id);
          tracks.push(track);
        }
      }
    }

    return tracks;
  } catch {
    return [];
  }
}

// ── Local song row ─────────────────────────────────────────────────────────────

type LocalRowProps = {
  song: SongBase;
  playlistId: string;
};

const LocalRow: React.FC<LocalRowProps> = ({ song, playlistId }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { playSimilar } = usePlayingActions();
  const { resolvePlayableSong } = usePlayableSongResolver();
  const addToPlaylist = useAddSongToPlaylist();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handlePress = useCallback(async () => {
    try {
      const full = await resolvePlayableSong(song);
      if (full) await playSimilar(full);
      else toast.error(t('common.playbackError'));
    } catch {
      toast.error(t('common.playbackError'));
    }
  }, [playSimilar, resolvePlayableSong, song, t]);

  const handleAdd = useCallback(async () => {
    if (adding || added) return;
    setAdding(true);
    try {
      await addToPlaylist.mutateAsync({ playlistId, songId: song.id });
      setAdded(true);
      toast.success(t('playlist.recommended.added'));
    } catch {
      toast.error(t('playlist.recommended.addFailed'));
    } finally {
      setAdding(false);
    }
  }, [adding, added, addToPlaylist, playlistId, song.id, t]);

  return (
    <MediaListRow
      title={song.title}
      subtitle={`${song.artist}${song.duration ? ` · ${formatSongDuration(song.duration)}` : ''}`}
      cover={song.cover}
      onPress={() => void handlePress()}
      variant="compact"
      trailing={
        <Touchable onPress={() => void handleAdd()} hitSlop={10} style={styles.actionBtn} disabled={adding || added}>
          {added
            ? <CheckCircle size={22} color={colors.placeholder} />
            : <CirclePlus size={22} color={(adding || added) ? colors.placeholder : colors.subtext} />
          }
        </Touchable>
      }
    />
  );
};

// ── External song row ──────────────────────────────────────────────────────────

type ExternalRowProps = {
  song: ExternalSong;
  hasDownloader: boolean;
  onDownload: (song: ExternalSong) => void;
};

const ExternalRow: React.FC<ExternalRowProps> = ({ song, hasDownloader, onDownload }) => {
  const { colors } = useTheme();
  const { toggle } = usePreviewPlayer();
  const hasPreview = !!song.previewUrl;

  return (
    <MediaListRow
      title={song.title}
      subtitle={`${song.artist}${song.duration ? ` · ${formatSongDuration(song.duration)}` : ''}`}
      cover={song.cover}
      onPress={() => song.previewUrl && void toggle(song, song.previewUrl)}
      disabled={!hasPreview}
      variant="compact"
      trailing={
        <Touchable
          onPress={() => hasDownloader && onDownload(song)}
          disabled={!hasDownloader}
          hitSlop={10}
          style={styles.actionBtn}
        >
          <CloudDownload
            size={22}
            color={hasDownloader ? colors.subtext : colors.muted}
          />
        </Touchable>
      }
    />
  );
};

// ── Local recommendations section ──────────────────────────────────────────────

type LocalRecommendedSectionProps = {
  playlist: Playlist;
  localSeed: number;
  onRefresh: () => void;
};

export const LocalRecommendedSection: React.FC<LocalRecommendedSectionProps> = ({
  playlist,
  localSeed,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { tracks } = useTracks();
  const api = useApi();
  const isOffline = useIsOffline();
  const isAudiomuseConfigured = useSelector(selectIsAudiomuseConfigured);
  const audiomuseConfig = useSelector(selectAudiomuseConfig);

  const playlistSongIds = useMemo(
    () => new Set((playlist.songs ?? []).map(s => s.id)),
    [playlist.songs]
  );

  const playlistArtistNames = useMemo(() => {
    const names = new Set<string>();
    for (const song of playlist.songs ?? []) {
      if (song.artist && song.artist.toLowerCase() !== 'various artists') {
        names.add(song.artist);
      }
    }
    return [...names].slice(0, 3);
  }, [playlist.songs]);

  // Same-artist shuffle from the local library — used whenever AudioMuse-AI
  // isn't configured, and as a safety net if its similarity call fails.
  const fallbackLocalSongs = useMemo<SongBase[]>(() => {
    const artistSet = new Set(playlistArtistNames.map(n => n.toLowerCase()));
    const pool = tracks.filter(
      s => !playlistSongIds.has(s.id) && s.artist && artistSet.has(s.artist.toLowerCase())
    );
    return seededShuffle(pool, localSeed).slice(0, LOCAL_COUNT);
  }, [tracks, playlistSongIds, playlistArtistNames, localSeed]);

  // Reseed a handful of playlist tracks each refresh so acoustic similarity
  // results vary too, matching the fallback's shuffled feel.
  const audiomuseSeeds = useMemo(
    () => seededShuffle(playlist.songs ?? [], localSeed).slice(0, 5),
    [playlist.songs, localSeed]
  );

  const audiomuseQuery = useQuery({
    queryKey: [
      QueryKeys.RecommendedLocalSongs,
      'audiomuse',
      playlist.id,
      audiomuseSeeds.map(s => s.id).join(','),
    ],
    queryFn: () => createAudiomuseQueueFillProvider(audiomuseConfig, api).fetchExtension({
      recentSongs: audiomuseSeeds,
      excludeIds: playlistSongIds,
      count: LOCAL_COUNT,
    }),
    enabled: isAudiomuseConfigured && !isOffline && audiomuseSeeds.length > 0,
    staleTime: 1000 * 60 * 30,
    networkMode: 'online',
  });

  const localSongs: SongBase[] = audiomuseQuery.data?.length
    ? audiomuseQuery.data
    : fallbackLocalSongs;

  if (localSongs.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader
        title={t('playlist.recommended.local')}
        action={
          <IconActionButton
            icon={<RefreshCw size={17} color={colors.subtext} />}
            onPress={onRefresh}
            accessibilityLabel={t('playlist.recommended.refresh')}
            size="compact"
          />
        }
      />

      {localSongs.map(song => (
        <LocalRow key={song.id} song={song} playlistId={playlist.id} />
      ))}
    </View>
  );
};

// ── Deezer recommendations section ─────────────────────────────────────────────

type DeezerRecommendedSectionProps = {
  playlist: Playlist;
  onRefreshExternal: () => void;
};

export const DeezerRecommendedSection: React.FC<DeezerRecommendedSectionProps> = ({
  playlist,
  onRefreshExternal,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rad = useRadius();
  const showSourceHeaders = useSelector(selectShowSourceHeaders);
  const isOffline = useIsOffline();
  const deezerEnabled = useSelector(selectDeezerDiscoveryEnabled);
  const hasDownloader = useAnyDownloaderConnected();
  const downloadSheetRef = useSheetRef();
  const [albumForDownload, setAlbumForDownload] = useState<ExternalAlbumBase | null>(null);

  const playlistArtistNames = useMemo(() => {
    const names = new Set<string>();
    for (const song of playlist.songs ?? []) {
      if (song.artist && song.artist.toLowerCase() !== 'various artists') {
        names.add(song.artist);
      }
    }
    return [...names].slice(0, 3);
  }, [playlist.songs]);

  const externalQueryKey = useMemo(
    () => [QueryKeys.RecommendedExternalSongs, 'playlist', playlist.id, playlistArtistNames.join(',')],
    [playlist.id, playlistArtistNames]
  );

  const externalQuery = useQuery({
    queryKey: externalQueryKey,
    queryFn: () => fetchExternalRecs(playlistArtistNames),
    // Deezer discovery gives us the top-tracks fetch. Last.fm's bundled key
    // expands seed artists into similar ones; without a key the section has
    // nothing to expand, so it stays hidden.
    enabled: deezerEnabled && !isOffline && playlistArtistNames.length > 0 && Boolean(LASTFM_API_KEY),
    staleTime: 1000 * 60 * 60 * 6,
    networkMode: 'online',
  });

  const handleDownloadExternalSong = useCallback(async (song: ExternalSong) => {
    if (!hasDownloader) return;
    if (!song.albumId) {
      toast.error(t('externalAlbum.download.startFailed'));
      return;
    }

    try {
      const album = await deezer.getDeezerAlbum(song.albumId);
      if (!album) {
        toast.error(t('externalAlbum.download.startFailed'));
        return;
      }

      setAlbumForDownload(album);
      requestAnimationFrame(() => {
        downloadSheetRef.current?.present();
      });
    } catch {
      toast.error(t('externalAlbum.download.startFailed'));
    }
  }, [downloadSheetRef, hasDownloader, t]);

  if (!deezerEnabled || isOffline || playlistArtistNames.length === 0 || !LASTFM_API_KEY) return null;

  return (
    <View style={styles.section}>
      <SectionHeader
        title={t('playlist.recommended.deezerTitle')}
        badge={
          showSourceHeaders ? (
            <View style={[styles.sourceBadge, styles.sourceBadgeDeezer, { borderRadius: rad.pill }]}>
              <Text style={styles.sourceBadgeLetter}>D</Text>
            </View>
          ) : undefined
        }
        action={
          <IconActionButton
            icon={<RefreshCw size={17} color={colors.subtext} />}
            onPress={onRefreshExternal}
            loading={externalQuery.isFetching}
            accessibilityLabel={t('playlist.recommended.refresh')}
            size="compact"
          />
        }
      />

      {externalQuery.isLoading ? (
        // Rows rather than a spinner: this is loading a list, and the
        // placeholder should keep the shape the list is about to take.
        <View style={styles.loader}>
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonListRow key={`recommended-loading-${index}`} />
          ))}
        </View>
      ) : (externalQuery.data ?? []).length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.placeholder }]}>
          {t('playlist.recommended.externalEmpty')}
        </Text>
      ) : (
        (externalQuery.data ?? []).map(song => (
          <ExternalRow
            key={song.id}
            song={song}
            hasDownloader={hasDownloader}
            onDownload={handleDownloadExternalSong}
          />
        ))
      )}

      {albumForDownload && (
        <DownloadSheet
          album={albumForDownload}
          sheetRef={downloadSheetRef}
        />
      )}
    </View>
  );
};

// ── Combined footer (used in PlaylistContent) ──────────────────────────────────

type RecommendedSectionProps = {
  playlist: Playlist;
};

const RecommendedSection: React.FC<RecommendedSectionProps> = ({ playlist }) => {
  const queryClient = useQueryClient();
  const [localSeed, setLocalSeed] = useState(() => Math.random());

  const playlistArtistNames = useMemo(() => {
    const names = new Set<string>();
    for (const song of playlist.songs ?? []) {
      if (song.artist && song.artist.toLowerCase() !== 'various artists') {
        names.add(song.artist);
      }
    }
    return [...names].slice(0, 3);
  }, [playlist.songs]);

  const externalQueryKey = useMemo(
    () => [QueryKeys.RecommendedExternalSongs, 'playlist', playlist.id, playlistArtistNames.join(',')],
    [playlist.id, playlistArtistNames]
  );

  const handleRefreshLocal = useCallback(() => {
    setLocalSeed(Math.random());
  }, []);

  const handleRefreshExternal = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: externalQueryKey });
  }, [queryClient, externalQueryKey]);

  return (
    <View style={styles.container}>
      <LocalRecommendedSection
        playlist={playlist}
        localSeed={localSeed}
        onRefresh={handleRefreshLocal}
      />
      <DeezerRecommendedSection
        playlist={playlist}
        onRefreshExternal={handleRefreshExternal}
      />
    </View>
  );
};

export default RecommendedSection;

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxxl,
  },
  section: {
    paddingTop: spacing.xl,
  },
  sourceBadge: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadgeDeezer: {
    backgroundColor: sourceColor.deezer,
  },
  sourceBadgeLetter: {
    ...typography.micro,
    fontWeight: '600',
    color: '#fff',
  },
  actionBtn: { padding: spacing.xs },
  loader: { marginVertical: spacing.xl },
  emptyText: {
    ...typography.caption,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.roomy,
  },
});
