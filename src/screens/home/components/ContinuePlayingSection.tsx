import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import type { Song } from '@/types';
import { useApi } from '@/api';
import { usePlayingActions } from '@/contexts/PlayingContext';
import { songFromBookmarkSnapshot } from '@/utils/playback/bookmarkSnapshot';
import { useTheme } from '@/hooks/useTheme';
import { useRadius } from '@/hooks/useRadius';
import { selectLibraryTracks } from '@/utils/redux/selectors/librarySelectors';
import { selectPersistedPlaybackBookmarks } from '@/utils/redux/selectors/playbackSelectors';
import {
  SECTION_H_PADDING as H_PADDING,
  SECTION_GRID_GAP,
  SECTION_VISIBLE_ITEMS,
} from '@/features/home/constants';
import MediaTile from './MediaTile';
import { spacing, typography } from '@/constants/design';

type Entry = { song: Song; positionMs: number };

/**
 * Home shelf that surfaces long-form tracks with a saved resume position —
 * the local bookmark map now feeds every provider (Navidrome via server
 * bookmarks, Jellyfin/Emby via PlaybackPositionTicks), so this row is a
 * genuine "pick back up" surface regardless of what backs the app.
 *
 * Ordered by most-recently-paused; tapping a tile plays the track (auto-
 * resume is already wired into PlayingContext, so it lands at the saved
 * position without this component having to seek explicitly).
 */
const MAX_ENTRIES = 8;

export default function ContinuePlayingSection() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rad = useRadius();
  const { width: screenWidth } = useWindowDimensions();
  const { playSong } = usePlayingActions();
  const api = useApi();
  const tracks = useSelector(selectLibraryTracks);
  const bookmarks = useSelector(selectPersistedPlaybackBookmarks);

  const itemSize = useMemo(
    () => (screenWidth - H_PADDING * 2 - SECTION_GRID_GAP * 2) / SECTION_VISIBLE_ITEMS,
    [screenWidth]
  );

  // Bookmarks map is keyed by song id; ordered by most-recent updatedAt.
  //
  // Two sources, because there are two kinds of entry. A library track is
  // joined against the synced library, which stays authoritative for
  // re-tagging and artwork — and a bookmark for a track no longer there is
  // dropped, since a row with no title is worse than a shorter shelf.
  //
  // A podcast episode is never in that library: `buildPodcastSong` namespaces
  // its id with `podcast:` exactly so it cannot collide with a real track, so
  // the join can never match and every podcast bookmark used to fall through
  // the same "no longer in the library" branch. Those carry a snapshot
  // written beside the position, which is what draws them here.
  const entries = useMemo<Entry[]>(() => {
    const byId = new Map(tracks.map((t) => [t.id, t as unknown as Song]));
    return Object.entries(bookmarks)
      .map(([songId, entry]) => {
        const song = byId.get(songId);
        if (song) return { song, positionMs: entry.positionMs, updatedAt: entry.updatedAt };
        if (entry.snapshot) {
          return {
            // The URL is rebuilt when the tile is tapped — the stored snapshot
            // deliberately holds no credentialled one.
            song: songFromBookmarkSnapshot(songId, entry.snapshot, ''),
            positionMs: entry.positionMs,
            updatedAt: entry.updatedAt,
          };
        }
        return null;
      })
      .filter((e): e is Entry & { updatedAt: number } => e !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_ENTRIES);
  }, [bookmarks, tracks]);

  const handlePress = useCallback((entry: Entry) => {
    // Player auto-resumes to the saved position when it loads — see
    // useBookmarkManager wiring in PlayingContext.
    //
    // A snapshot entry arrives with no stream URL, deliberately: the stored
    // one would be signed with the user's token and this state is persisted.
    // Build a fresh one now, from the id the snapshot did keep.
    if (!entry.song.streamUrl && entry.song.streamId) {
      void playSong({
        ...entry.song,
        streamUrl: api.songs.buildStreamUrl(entry.song.streamId, 'high'),
      });
      return;
    }
    void playSong(entry.song);
  }, [api.songs, playSong]);

  const renderEntry = useCallback(({ item }: { item: Entry }) => (
    <MediaTile
      cover={item.song.cover}
      title={item.song.title}
      subtitle={item.song.artist}
      size={itemSize}
      radius={rad.card}
      onPress={() => handlePress(item)}
    />
  ), [handlePress, itemSize, rad.card]);

  if (entries.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.secondary }]}>
        {t('explore.sections.continuePlaying')}
      </Text>
      <FlashList
        horizontal
        data={entries}
        keyExtractor={(e) => e.song.id}
        overrideItemLayout={(layout) => { (layout as { size?: number }).size = itemSize; }}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: H_PADDING }}
        ItemSeparatorComponent={() => <View style={{ width: SECTION_GRID_GAP }} />}
        renderItem={renderEntry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { ...typography.sectionTitle, marginBottom: spacing.md, marginLeft: H_PADDING },
});
