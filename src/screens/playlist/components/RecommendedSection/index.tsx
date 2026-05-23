import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CheckCircle, CirclePlus, RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@backpackapp-io/react-native-toast';

import { useTheme } from '@/hooks/useTheme';
import { MediaImage } from '@/components/MediaImage';
import { usePlaying } from '@/contexts/PlayingContext';
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer';
import { selectThemeColor, selectShowSourceHeaders } from '@/utils/redux/selectors/settingsSelectors';
import { useAddSongToPlaylist } from '@/hooks/playlists';
import { useTracks } from '@/hooks/tracks';
import { usePlayableSongResolver } from '@/hooks/songs';
import { useIsOffline } from '@/hooks/useIsOffline';
import { useSheetRef } from '@/utils/useSheetRef';
import * as deezer from '@/api/deezer';
import { getLastFmSimilarArtists } from '@/api/rawarr/lastfm/getSimilarArtists';
import { RAWARR_URL } from '@/constants/rawarr';
import { QueryKeys } from '@/enums/queryKeys';
import DownloadAlbumSheet from '@/components/options/DownloadAlbumSheet';
import {
  selectLidarrAuthenticated,
  selectSlskdAuthenticated,
} from '@/utils/redux/selectors/downloadersSelectors';
import { selectDeezerDiscoveryEnabled } from '@/utils/redux/selectors/settingsSelectors';
import { CloudDownload } from 'lucide-react-native';
import { formatSongDuration } from '@/utils/formatDuration';
import type { Playlist, SongBase, ExternalAlbumBase, ExternalSong } from '@/types';

const LOCAL_COUNT = 8;
const EXTERNAL_COUNT = 8;
const COVER_SIZE = 44;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = (seed * 2 ** 31) | 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s, 1664525) + 1013904223;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchExternalRecs(artistNames: string[]): Promise<ExternalSong[]> {
  if (!artistNames.length) return [];

  try {
    const similarResults = await Promise.all(
      artistNames.map(name => getLastFmSimilarArtists(RAWARR_URL, name, 15))
    );

    const seen = new Set<string>(artistNames.map(n => n.toLowerCase()));
    const candidates: string[] = [];
    for (const similar of similarResults) {
      for (const s of shuffle(similar)) {
        if (candidates.length >= artistNames.length * 8) break;
        const key = s.name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          candidates.push(s.name);
        }
      }
    }

    const shuffledCandidates = shuffle(candidates);
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
    const groups = shuffle(trackGroups.filter(group => group.length > 0));

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

// ── Shared section header ──────────────────────────────────────────────────────

type SectionHeaderProps = {
  title: string;
  badge?: React.ReactNode;
};

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, badge }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionTitleRow}>
      {badge}
      <Text style={[styles.sectionTitle, { color: colors.secondary }]}>{title}</Text>
    </View>
  );
};

// ── Local song row ─────────────────────────────────────────────────────────────

type LocalRowProps = {
  song: SongBase;
  playlistId: string;
};

const LocalRow: React.FC<LocalRowProps> = ({ song, playlistId }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { playSimilar } = usePlaying();
  const { resolvePlayableSong } = usePlayableSongResolver();
  const addToPlaylist = useAddSongToPlaylist();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handlePress = useCallback(async () => {
    try {
      const full = await resolvePlayableSong(song);
      if (full) await playSimilar(full);
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
    <TouchableOpacity style={styles.row} onPress={() => void handlePress()} activeOpacity={0.7}>
      <MediaImage cover={song.cover} size="thumb" style={styles.cover} />
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: colors.secondary }]} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={[styles.rowSub, { color: colors.subtext }]} numberOfLines={1}>
          {song.artist}{song.duration ? ` · ${formatSongDuration(song.duration)}` : ''}
        </Text>
      </View>
      <TouchableOpacity onPress={() => void handleAdd()} hitSlop={10} style={styles.actionBtn} disabled={adding || added}>
        {added
          ? <CheckCircle size={22} color={colors.placeholder} />
          : <CirclePlus size={22} color={(adding || added) ? colors.placeholder : colors.subtext} />
        }
      </TouchableOpacity>
    </TouchableOpacity>
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
    <TouchableOpacity
      style={styles.row}
      onPress={() => song.previewUrl && void toggle(song, song.previewUrl)}
      disabled={!hasPreview}
      activeOpacity={hasPreview ? 0.7 : 1}
    >
      <MediaImage cover={song.cover} size="thumb" style={styles.cover} />
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: colors.secondary }]} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={[styles.rowSub, { color: colors.subtext }]} numberOfLines={1}>
          {song.artist}{song.duration ? ` · ${formatSongDuration(song.duration)}` : ''}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => hasDownloader && onDownload(song)}
        disabled={!hasDownloader}
        hitSlop={10}
        style={styles.actionBtn}
      >
        <CloudDownload
          size={22}
          color={hasDownloader ? colors.subtext : colors.muted}
        />
      </TouchableOpacity>
    </TouchableOpacity>
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

  const localSongs = useMemo<SongBase[]>(() => {
    const artistSet = new Set(playlistArtistNames.map(n => n.toLowerCase()));
    const pool = tracks.filter(
      s => !playlistSongIds.has(s.id) && s.artist && artistSet.has(s.artist.toLowerCase())
    );
    return seededShuffle(pool, localSeed).slice(0, LOCAL_COUNT);
  }, [tracks, playlistSongIds, playlistArtistNames, localSeed]);

  if (localSongs.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={t('playlist.recommended.local')} />

      {localSongs.map(song => (
        <LocalRow key={song.id} song={song} playlistId={playlist.id} />
      ))}

      <TouchableOpacity
        style={[styles.refreshBtn, { borderColor: colors.border }]}
        onPress={onRefresh}
        activeOpacity={0.7}
      >
        <RefreshCw size={16} color={colors.subtext} />
        <Text style={[styles.refreshText, { color: colors.subtext }]}>
          {t('playlist.recommended.refresh')}
        </Text>
      </TouchableOpacity>
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
  const themeColor = useSelector(selectThemeColor);
  const showSourceHeaders = useSelector(selectShowSourceHeaders);
  const isOffline = useIsOffline();
  const deezerEnabled = useSelector(selectDeezerDiscoveryEnabled);
  const isLidarrConnected = useSelector(selectLidarrAuthenticated);
  const isSlskdConnected = useSelector(selectSlskdAuthenticated);
  const hasDownloader = isLidarrConnected || isSlskdConnected;
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
    enabled: deezerEnabled && !isOffline && playlistArtistNames.length > 0,
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

  if (!deezerEnabled || isOffline || playlistArtistNames.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader
        title={t('playlist.recommended.deezerTitle')}
        badge={
          showSourceHeaders ? (
            <View style={[styles.sourceBadge, styles.sourceBadgeDeezer]}>
              <Text style={styles.sourceBadgeLetter}>D</Text>
            </View>
          ) : undefined
        }
      />

      {externalQuery.isLoading ? (
        <ActivityIndicator color={themeColor} style={styles.loader} />
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

      <TouchableOpacity
        style={[styles.refreshBtn, { borderColor: colors.border }]}
        onPress={onRefreshExternal}
        activeOpacity={0.7}
        disabled={externalQuery.isFetching}
      >
        <RefreshCw
          size={16}
          color={colors.subtext}
          style={{ opacity: externalQuery.isFetching ? 0.3 : 1 }}
        />
        <Text style={[styles.refreshText, { color: colors.subtext, opacity: externalQuery.isFetching ? 0.3 : 1 }]}>
          {t('playlist.recommended.refresh')}
        </Text>
      </TouchableOpacity>

      {albumForDownload && (
        <DownloadAlbumSheet
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
    paddingBottom: 40,
  },
  section: {
    paddingTop: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  sourceBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadgeDeezer: {
    backgroundColor: '#A238CA',
  },
  sourceBadgeLetter: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cover: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: 6,
    marginRight: 12,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '400',
  },
  rowSub: {
    fontSize: 13,
    marginTop: 1,
  },
  actionBtn: { padding: 4 },
  loader: { marginVertical: 24 },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
