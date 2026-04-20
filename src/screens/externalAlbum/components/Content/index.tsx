import React, { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { ExternalAlbum, ExternalSong } from '@/types';
import ExternalAlbumHeader from '../Header';
import ExternalSongRow from '@/components/rows/ExternalSongRow';
import ListSeparator from '@/components/ListSeparator';
import { useExternalAlbumPreviews } from '@/hooks/albums/useExternalAlbumPreviews';
import { usePreviewPlayer, externalSongToTrack } from '@/hooks/usePreviewPlayer';

type Props = {
  album: ExternalAlbum;
};

const ESTIMATED_ROW_HEIGHT = 72;

const ExternalAlbumContent: React.FC<Props> = ({ album }) => {
  const songs = album.songs ?? [];
  const previewsRaw = useExternalAlbumPreviews(album);
  const previews: Map<string, string> = previewsRaw instanceof Map ? previewsRaw : new Map();
  const { toggleInAlbum } = usePreviewPlayer();

  // Build the full album preview queue once so all rows share the same array reference.
  const albumPreviewSongs = useMemo(() =>
    songs
      .filter(s => previews.has(s.id))
      .map(s => externalSongToTrack(s, previews.get(s.id)!)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [previews]
  );

  const handleSongPress = useCallback((song: ExternalSong) => {
    const url = previews.get(song.id);
    if (!url) return;
    toggleInAlbum(song, url, albumPreviewSongs, album.id, album.title);
  }, [previews, albumPreviewSongs, toggleInAlbum, album.id, album.title]);

  const header = useMemo(() => <ExternalAlbumHeader album={album} />, [album]);

  const renderItem = ({ item, index }: { item: ExternalSong; index: number }) => {
    const previewUrl = previews.get(item.id);

    return (
      <ExternalSongRow
        song={item}
        trackNumber={index + 1}
        albumTitle={album.title}
        albumArtist={album.artist}
        previewUrl={previewUrl}
        onPress={previewUrl ? () => handleSongPress(item) : undefined}
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
