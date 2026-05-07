import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';

import { Playlist, Song } from '@/types';
import SongRow from '@/components/rows/SongRow';
import SectionEmptyState from '@/screens/explore/components/SectionEmptyState';
import { useStarredSongs } from '@/hooks/starred';

import Header from '../Header';
import RecommendedSection from '../RecommendedSection';

type Props = {
  playlist: Playlist;
};

const ESTIMATED_ROW_HEIGHT = 72;

const PlaylistContent: React.FC<Props> = ({ playlist }) => {
  const { t } = useTranslation();
  const { songs: starredSongs } = useStarredSongs();
  const songs = playlist.songs ?? [];
  const starredSongIds = useMemo(
    () => new Set(starredSongs.map(song => song.id)),
    [starredSongs]
  );

  const header = useMemo(() => <Header playlist={playlist} />, [playlist]);
  const footer = useMemo(() => <RecommendedSection playlist={playlist} />, [playlist]);

  const renderItem = ({ item }: { item: Song }) => (
    <SongRow
      song={item}
      collection={playlist}
      showDownloadedDot
      isFavorite={starredSongIds.has(item.id)}
    />
  );

  return (
    <FlashList<Song>
      data={songs}
      keyExtractor={(item, index) => `${item.id}:${index}`}
      renderItem={renderItem}
      {...({ estimatedItemSize: ESTIMATED_ROW_HEIGHT } as any)}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ListEmptyComponent={<SectionEmptyState message={t('playlist.empty')} />}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 180 : 140 }}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default PlaylistContent;
