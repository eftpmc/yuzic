import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ellipsis } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { usePlaying } from '@/contexts/PlayingContext';
import { usePlayableSongResolver } from '@/hooks/songs';
import { MediaImage } from '@/components/MediaImage';
import SongOptions from '@/components/options/SongOptions';
import PlaylistList from '@/components/PlaylistList';
import { useSheetRef } from '@/utils/useSheetRef';
import {
  selectSongPlayCounts,
  selectSongLastPlayedAt,
} from '@/utils/redux/selectors/statsSelectors';
import { selectSongsById } from '@/utils/redux/selectors/librarySelectors';
import { seededShuffle } from '@/features/home/hooks/useDailyLayout';
import SectionEmptyState from '../SectionEmptyState';
import type { Song, SongBase } from '@/types';

const PAGE_SIZE = 4;
const TOTAL_PAGES = 3;
const TOTAL_PICKS = PAGE_SIZE * TOTAL_PAGES;
const CANDIDATE_POOL = TOTAL_PICKS * 2; // draw from a wider pool on refresh
const H_PADDING = 12;
const IMG_SIZE = 44;
const DECAY_MS = 7 * 24 * 60 * 60 * 1000;
const PEEK = 28; // pixels of the next page visible at the right edge

function useQuickPicks(refreshKey: number): SongBase[] {
  const songsById = useSelector(selectSongsById);
  const playCounts = useSelector(selectSongPlayCounts);
  const lastPlayedAt = useSelector(selectSongLastPlayedAt);

  return useMemo(() => {
    const now = Date.now();
    const scored: { song: SongBase; score: number }[] = [];

    // Only iterate songs that actually have stats — avoids scanning the full 9000-song
    // library on every play count change (O(played) instead of O(library)).
    const idsWithStats = new Set([...Object.keys(playCounts), ...Object.keys(lastPlayedAt)]);

    for (const id of idsWithStats) {
      const song = songsById.get(id);
      if (!song) continue;
      const count = playCounts[id] ?? 0;
      const ts = lastPlayedAt[id] ?? 0;
      const recency = ts > 0 ? Math.exp(-(now - ts) / DECAY_MS) : 0;
      const freq = count > 0 ? Math.min(1, Math.log(count + 1) / Math.log(50)) : 0;
      scored.push({ song, score: recency * 0.8 + freq * 0.2 });
    }

    scored.sort((a, b) => b.score - a.score);
    const pool = scored.slice(0, CANDIDATE_POOL).map(s => s.song);
    if (refreshKey === 0) return pool.slice(0, TOTAL_PICKS);
    return seededShuffle(pool, (Math.imul(refreshKey, 1664525) + 1013904223) | 0).slice(0, TOTAL_PICKS);
  }, [songsById, playCounts, lastPlayedAt, refreshKey]);
}

type Props = { refreshKey?: number };

export default function QuickPicksSection({ refreshKey = 0 }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { playSong } = usePlaying();
  const { resolvePlayableSong } = usePlayableSongResolver();
  const picks = useQuickPicks(refreshKey);
  const { width: screenWidth } = useWindowDimensions();

  const optionsRef = useSheetRef();
  const playlistRef = useSheetRef();
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [playlistSong, setPlaylistSong] = useState<Song | null>(null);
  const pendingPresentRef = useRef(false);

  const inFlightRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedSong && pendingPresentRef.current) {
      pendingPresentRef.current = false;
      optionsRef.current?.present();
    }
  }, [selectedSong, optionsRef]);

  const handlePress = async (song: SongBase) => {
    if (inFlightRef.current === song.id) return;
    inFlightRef.current = song.id;
    try {
      const playable = await resolvePlayableSong(song);
      if (playable) await playSong(playable);
    } finally {
      inFlightRef.current = null;
    }
  };

  const handleOptions = async (song: SongBase) => {
    const resolved = await resolvePlayableSong(song, { allowNetwork: false });
    const target = resolved ?? ({ ...song, streamUrl: '' } as Song);
    pendingPresentRef.current = true;
    setSelectedSong(target);
  };

  const openPlaylistList = () => {
    optionsRef.current?.dismiss();
    setPlaylistSong(selectedSong);
    requestAnimationFrame(() => playlistRef.current?.present());
  };

  const closePlaylistList = () => {
    playlistRef.current?.dismiss();
    setPlaylistSong(null);
  };

  const pages = useMemo(() => {
    const result: SongBase[][] = [];
    for (let i = 0; i < picks.length; i += PAGE_SIZE) {
      result.push(picks.slice(i, i + PAGE_SIZE));
    }
    return result;
  }, [picks]);

  return (
    <>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.secondary }]}>
          {t('explore.sections.quickPicks')}
        </Text>

        {pages.length === 0 ? (
          <SectionEmptyState message={t('explore.empty.quickPicks')} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={screenWidth - PEEK}
            snapToAlignment="start"
          >
            {pages.map((page, pageIdx) => (
              <View key={pageIdx} style={[styles.page, { width: screenWidth - PEEK }]}>
                {page.map(song => (
                  <TouchableOpacity
                    key={song.id}
                    style={styles.row}
                    onPress={() => { void handlePress(song); }}
                    activeOpacity={0.7}
                  >
                    <MediaImage cover={song.cover} size="thumb" style={styles.art} />
                    <View style={styles.info}>
                      <Text style={[styles.trackTitle, { color: colors.secondary }]} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text style={[styles.trackArtist, { color: colors.subtext }]} numberOfLines={1}>
                        {song.artist}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => { void handleOptions(song); }}
                      hitSlop={10}
                    >
                      <Ellipsis
                        size={18}
                        color={colors.secondary}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {selectedSong && (
        <SongOptions
          ref={optionsRef}
          selectedSong={selectedSong}
          onAddToPlaylist={openPlaylistList}
        />
      )}

      <PlaylistList
        ref={playlistRef}
        selectedSong={playlistSong}
        onClose={closePlaylistList}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: H_PADDING,
  },
  page: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PADDING,
    paddingVertical: 6,
    gap: 12,
  },
  art: {
    width: IMG_SIZE,
    height: IMG_SIZE,
    borderRadius: 4,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  trackArtist: {
    fontSize: 13,
  },
});
