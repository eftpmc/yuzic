import React, { useCallback, useMemo, useRef } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';

import { Playlist, Song } from '@/types';
import SongRow from '@/components/rows/SongRow';
import LoadingSongRow from '@/components/rows/SongRow/Loading';
import SectionEmptyState from '@/screens/home/components/SectionEmptyState';
import { useStarredSongs } from '@/hooks/starred';

import Header, { PlaylistHeaderBar } from '../Header';
import RecommendedSection from '../RecommendedSection';
import PlaylistOptions from '@/components/options/PlaylistOptions';
import { DetailScreen } from '@/components/DetailHeader';
import { useScrollClearance } from '@/hooks/useScrollClearance';

type Props = {
  playlist: Playlist;
  songsLoading?: boolean;
};

type SongItem = { type: 'song'; song: Song };
type SkeletonItem = { type: 'skeleton'; id: string };
type ListItem = SongItem | SkeletonItem;

const PlaylistContent: React.FC<Props> = ({ playlist, songsLoading }) => {
  const scrollClearance = useScrollClearance();
  const { t } = useTranslation();
  const { songs: starredSongs } = useStarredSongs();
  const optionsRef = useRef<BottomSheetModal>(null);
  const songs = useMemo(() => playlist.songs ?? [], [playlist.songs]);
  const starredSongIds = useMemo(
    () => new Set(starredSongs.map(song => song.id)),
    [starredSongs]
  );
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
    <DetailScreen
      bar={<PlaylistHeaderBar playlist={playlist} onOptions={() => optionsRef.current?.present()} />}
    >
      {scroll => (
        <>
      <FlashList<ListItem>
        data={items}
        keyExtractor={(item, index) => item.type === 'song' ? `${item.song.id}:${index}` : item.id}
        renderItem={renderItem}
        ListHeaderComponent={<Header playlist={playlist} showNavigation={false} onOptions={() => optionsRef.current?.present()} />}
        ListFooterComponent={<RecommendedSection playlist={playlist} />}
        ListEmptyComponent={songsLoading ? null : <SectionEmptyState message={t('playlist.empty')} />}
        contentContainerStyle={{ paddingBottom: scrollClearance }}
        showsVerticalScrollIndicator={false}
        {...scroll}
      />
      <PlaylistOptions ref={optionsRef} playlist={playlist} hideGoToPlaylist />
        </>
      )}
    </DetailScreen>
  );
};

export default PlaylistContent;
