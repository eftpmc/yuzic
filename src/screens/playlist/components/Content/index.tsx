import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';

import { Playlist, Song } from '@/types';
import SongRow from '@/components/rows/SongRow';
import ListSeparator from '@/components/ListSeparator';
import SectionEmptyState from '@/screens/explore/components/SectionEmptyState';

import Header from '../Header';

type Props = {
  playlist: Playlist;
};

const ESTIMATED_ROW_HEIGHT = 72;

const PlaylistContent: React.FC<Props> = ({ playlist }) => {
  const { t } = useTranslation();
  const songs = playlist.songs ?? [];

  const header = useMemo(() => {
    return <Header playlist={playlist} />;
  }, [playlist]);

  const renderItem = ({ item, index }: { item: Song; index: number }) => (
    <SongRow
      song={item}
      collection={playlist}
      selectedIndex={index}
      showDownloadedDot
    />
  );

  return (
    <FlashList<Song>
      data={songs}
      keyExtractor={(item, index) => `${item.id}:${index}`}
      renderItem={renderItem}
      {...({ estimatedItemSize: ESTIMATED_ROW_HEIGHT } as any)}
      ListHeaderComponent={header}
      ListEmptyComponent={<SectionEmptyState message={t('playlist.empty')} />}
      ItemSeparatorComponent={() => <ListSeparator variant="compact" />}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 180 : 140 }}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default PlaylistContent;
