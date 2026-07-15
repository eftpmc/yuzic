import React, { useCallback, useMemo, useRef } from 'react';
import { Platform, View } from 'react-native';
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
import PlaylistEditorSheet from '@/components/PlaylistEditorSheet';
import PlaylistOptions from '@/components/options/PlaylistOptions';

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
  const editorRef = useRef<BottomSheetModal>(null);
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
    <View style={{ flex: 1 }}>
      <PlaylistHeaderBar playlist={playlist} onOptions={() => optionsRef.current?.present()} />
      <FlashList<ListItem>
        data={items}
        keyExtractor={(item, index) => item.type === 'song' ? `${item.song.id}:${index}` : item.id}
        renderItem={renderItem}
        ListHeaderComponent={<Header playlist={playlist} showNavigation={false} onOptions={() => optionsRef.current?.present()} onEdit={() => editorRef.current?.present()} />}
        ListFooterComponent={<RecommendedSection playlist={playlist} />}
        ListEmptyComponent={songsLoading ? null : <SectionEmptyState message={t('playlist.empty')} />}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 180 : 140 }}
        showsVerticalScrollIndicator={false}
      />
      <PlaylistOptions ref={optionsRef} playlist={playlist} hideGoToPlaylist onEdit={() => editorRef.current?.present()} />
      <PlaylistEditorSheet ref={editorRef} playlist={playlist} />
    </View>
  );
};

export default PlaylistContent;
