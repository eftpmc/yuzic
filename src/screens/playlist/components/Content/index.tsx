import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';

import { Playlist, Song } from '@/types';
import SongRow from '@/components/rows/SongRow';
import LoadingSongRow from '@/components/rows/SongRow/Loading';
import SectionEmptyState from '@/screens/home/components/SectionEmptyState';
import { useStarredSongs } from '@/hooks/starred';

import Header from '../Header';
import RecommendedSection from '../RecommendedSection';

type Props = {
  playlist: Playlist;
  songsLoading?: boolean;
};

const ESTIMATED_ROW_HEIGHT = 72;

type SongItem = { type: 'song'; song: Song };
type SkeletonItem = { type: 'skeleton'; id: string };
type ListItem = SongItem | SkeletonItem;

const PlaylistContent: React.FC<Props> = ({ playlist, songsLoading }) => {
  const { t } = useTranslation();
  const { songs: starredSongs } = useStarredSongs();
  const songs = playlist.songs ?? [];
  const starredSongIds = useMemo(
    () => new Set(starredSongs.map(song => song.id)),
    [starredSongs]
  );

  const header = useMemo(() => <Header playlist={playlist} />, [playlist]);
  const footer = useMemo(() => <RecommendedSection playlist={playlist} />, [playlist]);

  const items = useMemo<ListItem[]>(() => {
    if (songsLoading) {
      return Array.from({ length: 8 }, (_, i) => ({ type: 'skeleton' as const, id: `sk-${i}` }));
    }

    return songs.map(song => ({ type: 'song', song }));
  }, [songs, songsLoading]);

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'skeleton') {
      return <LoadingSongRow />;
    }

    return (
      <SongRow
        song={item.song}
        collection={playlist}
        showDownloadedDot
        isFavorite={starredSongIds.has(item.song.id)}
      />
    );
  };

  return (
    <FlashList<ListItem>
      data={items}
      keyExtractor={(item, index) => item.type === 'song' ? `${item.song.id}:${index}` : item.id}
      renderItem={renderItem}
      {...({ estimatedItemSize: ESTIMATED_ROW_HEIGHT } as any)}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ListEmptyComponent={songsLoading ? null : <SectionEmptyState message={t('playlist.empty')} />}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 180 : 140 }}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default PlaylistContent;
