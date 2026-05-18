import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { selectAlbumLastPlayedAt, selectPlaylistLastPlayedAt } from '@/utils/redux/selectors/statsSelectors';
import { useAlbums } from '@/hooks/albums';
import { usePlaylists } from '@/hooks/playlists';
import { useTheme } from '@/hooks/useTheme';
import MediaTile from '../MediaTile';
import SectionEmptyState from '../SectionEmptyState';
import { useTranslation } from 'react-i18next';
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers';
import { AlbumBase, PlaylistBase } from '@/types';

const H_PADDING = 12;
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

export default function RecentlyPlayed() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const itemWidth = getItemWidth(width);

  const albumLastPlayedAt = useSelector(selectAlbumLastPlayedAt);
  const playlistLastPlayedAt = useSelector(selectPlaylistLastPlayedAt);
  const { albums } = useAlbums();
  const { playlists } = usePlaylists();

  const items = useMemo<RecentItem[]>(() => {
    const result: RecentItem[] = [];

    for (const [id, ts] of Object.entries(albumLastPlayedAt)) {
      if (ts <= 0) continue;
      const album = albums.find(a => a.id === id);
      if (album) result.push({ kind: 'album', data: album, ts });
    }

    for (const [id, ts] of Object.entries(playlistLastPlayedAt)) {
      if (ts <= 0) continue;
      const playlist = playlists.find(p => p.id === id);
      if (playlist) result.push({ kind: 'playlist', data: playlist, ts });
    }

    return result.sort((a, b) => b.ts - a.ts).slice(0, MAX_ITEMS);
  }, [albumLastPlayedAt, playlistLastPlayedAt, albums, playlists]);

  const coversToPrefetch = useMemo(() => items.map(i => i.data.cover), [items]);
  usePrefetchCovers(coversToPrefetch, 'grid');

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.secondary }]}>
        {t('explore.sections.recentlyPlayed')}
      </Text>
      {items.length < MIN_ITEMS ? (
        <SectionEmptyState message={t('explore.empty.recentlyPlayed')} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {items.map(item => (
            <View key={`${item.kind}-${item.data.id}`} style={[styles.item, { width: itemWidth }]}>
              <MediaTile
                cover={item.data.cover}
                title={item.data.title}
                subtitle={item.data.subtext}
                size={itemWidth}
                radius={item.kind === 'playlist' ? 6 : 8}
                onPress={() =>
                  item.kind === 'album'
                    ? navigation.navigate('albumView', { id: item.data.id })
                    : navigation.navigate('playlistView', { id: item.data.id })
                }
              />
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
    marginBottom: 12,
    marginLeft: H_PADDING,
  },
  scrollContent: {
    paddingHorizontal: H_PADDING,
    gap: GAP,
  },
  item: {
    minWidth: 0,
  },
});
