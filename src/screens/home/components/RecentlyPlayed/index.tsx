import React, { memo, useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { selectAlbumLastPlayedAt, selectPlaylistLastPlayedAt } from '@/utils/redux/selectors/statsSelectors';
import { useAlbums } from '@/hooks/albums';
import { usePlaylists } from '@/hooks/playlists';
import MediaTile from '../MediaTile';
import SectionShelfHeader from '../SectionShelfHeader';
import { SECTION_H_PADDING } from '../sectionStyles';
import { useTranslation } from 'react-i18next';
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers';
import { AlbumBase, PlaylistBase } from '@/types';
import AlbumOptions from '@/components/options/AlbumOptions';
import PlaylistOptions from '@/components/options/PlaylistOptions';
import { useSheetRef } from '@/utils/useSheetRef';
import { spacing } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

// The shelf's own inset has to be the shared one: its heading comes from
// SectionShelfHeader, which is inset with every other shelf on the screen.
const H_PADDING = SECTION_H_PADDING;
const GAP = 10;
const VISIBLE_ITEMS = 3.2;
const MAX_ITEMS = 12;
const MIN_ITEMS = 1;

const getItemWidth = (width: number) => {
  const availableWidth = width - H_PADDING * 2;
  return (availableWidth - GAP * (VISIBLE_ITEMS - 1)) / VISIBLE_ITEMS;
};

type RecentItem =
  | { kind: 'album'; data: AlbumBase; ts: number }
  | { kind: 'playlist'; data: PlaylistBase; ts: number };

type TileProps = {
  item: RecentItem;
  itemWidth: number;
};

const RecentTile = memo(function RecentTile({ item, itemWidth }: TileProps) {
  const navigation = useNavigation<any>();
  const sheetRef = useSheetRef();
  const [optionsMounted, setOptionsMounted] = useState(false);
  const rad = useRadius();

  const handlePress = useCallback(() => {
    if (item.kind === 'album') {
      navigation.navigate('albumView', { id: item.data.id });
    } else {
      navigation.navigate('playlistView', { id: item.data.id });
    }
  }, [item, navigation]);

  const handleLongPress = useCallback(() => {
    if (!optionsMounted) {
      setOptionsMounted(true);
      requestAnimationFrame(() => sheetRef.current?.present());
    } else {
      sheetRef.current?.present();
    }
  }, [optionsMounted, sheetRef]);

  return (
    <>
      <View style={[styles.item, { width: itemWidth }]}>
        <MediaTile
          cover={item.data.cover}
          title={item.data.title}
          subtitle={item.data.subtext}
          size={itemWidth}
          radius={rad.card}
          onPress={handlePress}
          onLongPress={handleLongPress}
        />
      </View>
      {optionsMounted && (item.kind === 'album' ? (
        <AlbumOptions ref={sheetRef} album={item.data} hideGoToAlbum={false} />
      ) : (
        <PlaylistOptions ref={sheetRef} playlist={item.data} />
      ))}
    </>
  );
});

export default function RecentlyPlayed() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const itemWidth = getItemWidth(width);

  const albumLastPlayedAt = useSelector(selectAlbumLastPlayedAt);
  const playlistLastPlayedAt = useSelector(selectPlaylistLastPlayedAt);
  const { albums } = useAlbums();
  const { playlists } = usePlaylists();

  const items = useMemo<RecentItem[]>(() => {
    const albumMap = new Map(albums.map(a => [a.id, a]));
    const playlistMap = new Map(playlists.map(p => [p.id, p]));
    const result: RecentItem[] = [];

    for (const [id, ts] of Object.entries(albumLastPlayedAt)) {
      if (ts <= 0) continue;
      const album = albumMap.get(id);
      if (album) result.push({ kind: 'album', data: album, ts });
    }

    for (const [id, ts] of Object.entries(playlistLastPlayedAt)) {
      if (ts <= 0) continue;
      const playlist = playlistMap.get(id);
      if (playlist) result.push({ kind: 'playlist', data: playlist, ts });
    }

    return result.sort((a, b) => b.ts - a.ts).slice(0, MAX_ITEMS);
  }, [albumLastPlayedAt, playlistLastPlayedAt, albums, playlists]);

  const coversToPrefetch = useMemo(() => items.map(i => i.data.cover), [items]);
  usePrefetchCovers(coversToPrefetch, 'grid');

  // The shelf stops at twelve. "Most recently played first" is a sort order
  // the library list already has, so the heading leads there rather than to a
  // screen built for this one shelf — the whole library in that order, not
  // just the dozen that fit. The list keeps its own name; the sort control is
  // what says how it is ordered.
  const openAll = useCallback(
    () => navigation.push('libraryCollectionView', {
      sort: 'recent',
    }),
    [navigation]
  );

  // Hide the section entirely until there's play history to surface.
  if (items.length < MIN_ITEMS) return null;

  return (
    <View style={styles.container}>
      <SectionShelfHeader
        testID="home-recently-played-see-all"
        title={t('explore.sections.recentlyPlayed')}
        seeAllLabel={t('library.seeAll')}
        onSeeAll={openAll}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      >
        {items.map(item => (
          <RecentTile key={`${item.kind}-${item.data.id}`} item={item} itemWidth={itemWidth} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: H_PADDING,
    gap: GAP,
  },
  item: {
    minWidth: 0,
  },
});
