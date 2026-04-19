import React, { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { ExternalAlbum, ExternalSong } from '@/types';
import ExternalAlbumHeader from '../Header';
import ExternalSongRow from '@/components/rows/ExternalSongRow';
import ListSeparator from '@/components/ListSeparator';
import { useExternalAlbumPreviews } from '@/hooks/albums/useExternalAlbumPreviews';
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer';

type Props = {
  album: ExternalAlbum;
};

const ESTIMATED_ROW_HEIGHT = 72;

const ExternalAlbumContent: React.FC<Props> = ({ album }) => {
  const songs = album.songs ?? [];
  const previewsRaw = useExternalAlbumPreviews(album);
  const previews: Map<string, string> = previewsRaw instanceof Map ? previewsRaw : new Map();
  const { toggle } = usePreviewPlayer();

  const handleSongPress = useCallback((song: ExternalSong) => {
    const url = previews.get(song.id);
    if (!url) return;
    toggle(song, url);
  }, [previews, toggle]);

  const header = useMemo(() => <ExternalAlbumHeader album={album} />, [album]);

  const renderItem = ({ item, index }: { item: ExternalSong; index: number }) => {
    const hasPreview = previews.has(item.id);

    return (
      <ExternalSongRow
        song={item}
        trackNumber={index + 1}
        albumTitle={album.title}
        albumArtist={album.artist}
        hasPreview={hasPreview}
        onPress={hasPreview ? () => handleSongPress(item) : undefined}
      />
    );
  };

  return (
    <FlashList
      data={songs}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      estimatedItemSize={ESTIMATED_ROW_HEIGHT}
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <ListSeparator variant="compact" />}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 180 : 140 }}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default ExternalAlbumContent;
