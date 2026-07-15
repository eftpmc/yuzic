import React, { useCallback, useMemo, useState } from 'react';
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
import DetailTopBar from '@/components/DetailTopBar';

type Props = {
  playlist: Playlist;
  songsLoading?: boolean;
};

type SongItem = { type: 'song'; song: Song };
type SkeletonItem = { type: 'skeleton'; id: string };
type ListItem = SongItem | SkeletonItem;

const PlaylistContent: React.FC<Props> = ({ playlist, songsLoading }) => {
  const { t } = useTranslation();
  const { songs: starredSongs } = useStarredSongs();
  const songs = useMemo(() => playlist.songs ?? [], [playlist.songs]);
  const starredSongIds = useMemo(
    () => new Set(starredSongs.map(song => song.id)),
    [starredSongs]
  );
  const [showTopBar, setShowTopBar] = useState(false);
  const handleScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const next = event.nativeEvent.contentOffset.y > 80;
    setShowTopBar(previous => previous === next ? previous : next);
  }, []);

  const items = useMemo<ListItem[]>(() => {
    if (songsLoading) {
      return Array.from({ length: 8 }, (_, i) => ({ type: 'skeleton' as const, id: `sk-${i}` }));
    }

    return songs.map(song => ({ type: 'song', song }));
  }, [songs, songsLoading]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
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
  }, [starredSongIds, playlist]);

  return (
    <>
      <FlashList<ListItem>
        data={items}
        keyExtractor={(item, index) => item.type === 'song' ? `${item.song.id}:${index}` : item.id}
        renderItem={renderItem}
        ListHeaderComponent={<Header playlist={playlist} />}
        ListFooterComponent={<RecommendedSection playlist={playlist} />}
        ListEmptyComponent={songsLoading ? null : <SectionEmptyState message={t('playlist.empty')} />}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 180 : 140 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />
      <DetailTopBar title={playlist.title} visible={showTopBar} />
    </>
  );
};

export default PlaylistContent;
