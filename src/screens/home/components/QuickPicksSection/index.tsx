import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ellipsis } from 'lucide-react-native';
import { toast } from '@backpackapp-io/react-native-toast';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { usePlayingActions } from '@/contexts/PlayingContext';
import { usePlayableSongResolver } from '@/hooks/songs';
import { useSongActionSheets } from '@/contexts/SongActionSheetContext';
import IconActionButton from '@/components/IconActionButton';
import MediaListRow from '@/components/MediaListRow';
import {
  selectSongPlayCounts,
  selectSongLastPlayedAt,
} from '@/utils/redux/selectors/statsSelectors';
import { selectSongsById } from '@/utils/redux/selectors/librarySelectors';
import { seededShuffle } from '@/features/home/hooks/useDailyLayout';
import SectionEmptyState from '../SectionEmptyState';
import type { Song, SongBase } from '@/types';
import {
  QUICK_PICKS_PAGE_SIZE,
  QUICK_PICKS_TOTAL,
  QUICK_PICKS_CANDIDATE_POOL,
  QUICK_PICKS_DECAY_MS,
  QUICK_PICKS_PEEK,
  HOME_SECTION_HORIZONTAL_PADDING,
} from '@/constants/home';

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
      const recency = ts > 0 ? Math.exp(-(now - ts) / QUICK_PICKS_DECAY_MS) : 0;
      const freq = count > 0 ? Math.min(1, Math.log(count + 1) / Math.log(50)) : 0;
      scored.push({ song, score: recency * 0.8 + freq * 0.2 });
    }

    scored.sort((a, b) => b.score - a.score);
    const pool = scored.slice(0, QUICK_PICKS_CANDIDATE_POOL).map(s => s.song);
    if (refreshKey === 0) return pool.slice(0, QUICK_PICKS_TOTAL);
    return seededShuffle(pool, (Math.imul(refreshKey, 1664525) + 1013904223) | 0).slice(0, QUICK_PICKS_TOTAL);
  }, [songsById, playCounts, lastPlayedAt, refreshKey]);
}

type Props = { refreshKey?: number };

export default function QuickPicksSection({ refreshKey = 0 }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { playSong } = usePlayingActions();
  const { resolvePlayableSong } = usePlayableSongResolver();
  const picks = useQuickPicks(refreshKey);
  const { width: screenWidth } = useWindowDimensions();
  const { openSongOptions } = useSongActionSheets();

  const inFlightRef = useRef<string | null>(null);

  const handlePress = async (song: SongBase) => {
    if (inFlightRef.current === song.id) return;
    inFlightRef.current = song.id;
    try {
      const playable = await resolvePlayableSong(song);
      if (playable) await playSong(playable);
      else toast.error(t('common.playbackError'));
    } finally {
      inFlightRef.current = null;
    }
  };

  const handleOptions = async (song: SongBase) => {
    const resolved = await resolvePlayableSong(song, { allowNetwork: false });
    openSongOptions(resolved ?? ({ ...song, streamUrl: '' } as Song));
  };

  const pages = useMemo(() => {
    const result: SongBase[][] = [];
    for (let i = 0; i < picks.length; i += QUICK_PICKS_PAGE_SIZE) {
      result.push(picks.slice(i, i + QUICK_PICKS_PAGE_SIZE));
    }
    return result;
  }, [picks]);

  return (
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
          snapToInterval={screenWidth - QUICK_PICKS_PEEK}
          snapToAlignment="start"
        >
          {pages.map((page, pageIdx) => (
            <View key={pageIdx} style={[styles.page, { width: screenWidth - QUICK_PICKS_PEEK }]}>
              {page.map(song => (
                <MediaListRow
                  key={song.id}
                  title={song.title}
                  subtitle={song.artist}
                  cover={song.cover}
                  onPress={() => { void handlePress(song); }}
                  variant="compact"
                  style={styles.rowWrapper}
                  rowStyle={styles.row}
                  trailing={
                    <IconActionButton
                      icon={<Ellipsis size={18} color={colors.secondary} />}
                      onPress={() => { void handleOptions(song); }}
                      accessibilityLabel={`${song.title} options`}
                      size="compact"
                    />
                  }
                />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
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
    paddingHorizontal: HOME_SECTION_HORIZONTAL_PADDING,
  },
  page: {
    gap: 2,
  },
  rowWrapper: {
    paddingHorizontal: 0,
  },
  row: {
    paddingHorizontal: HOME_SECTION_HORIZONTAL_PADDING,
    paddingVertical: 6,
  },
});
