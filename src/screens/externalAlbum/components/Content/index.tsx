import React, { useCallback, useMemo } from 'react';
import { Platform, Text, View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { ExternalAlbum, ExternalSong } from '@/types';
import ExternalAlbumHeader from '../Header';
import ExternalSongRow from '@/components/rows/ExternalSongRow';
import { useExternalAlbumPreviews } from '@/hooks/albums/useExternalAlbumPreviews';
import { usePreviewPlayer, externalSongToTrack } from '@/hooks/usePreviewPlayer';
import { useTheme } from '@/hooks/useTheme';

const H_PADDING = 16;

type Props = {
  album: ExternalAlbum;
};

const ExternalAlbumContent: React.FC<Props> = ({ album }) => {
  const { colors } = useTheme();
  const songs = useMemo(() => album.songs ?? [], [album.songs]);
  const previews = useExternalAlbumPreviews(album);
  const { toggleInAlbum } = usePreviewPlayer();

  const albumPreviewSongs = useMemo(() =>
    songs
      .filter(s => !!previews[s.id])
      .map(s => externalSongToTrack(s, previews[s.id])),
    [previews, songs]
  );

  const handleSongPress = useCallback((song: ExternalSong) => {
    const url = previews[song.id];
    if (!url) return;
    toggleInAlbum(song, url, albumPreviewSongs, album.id, album.title);
  }, [previews, albumPreviewSongs, toggleInAlbum, album.id, album.title]);

  const footer = useMemo(() => {
    const totalSec = songs.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const duration = hrs > 0 ? `${hrs} hr ${mins} min` : `${mins} min`;
    const label = songs.length === 1 ? 'song' : 'songs';
    return (
      <View style={styles.statsFooter}>
        <Text style={[styles.statsText, { color: colors.subtext }]}>
          {songs.length} {label} · {duration}
        </Text>
      </View>
    );
  }, [songs, colors]);

  const renderItem = useCallback(({ item }: { item: ExternalSong }) => {
    const previewUrl = previews[item.id];
    return (
      <ExternalSongRow
        song={item}
        albumTitle={album.title}
        albumArtist={album.artist}
        previewUrl={previewUrl}
        onPress={previewUrl ? () => handleSongPress(item) : undefined}
      />
    );
  }, [previews, handleSongPress, album.title, album.artist]);

  return (
    <FlashList
      data={songs}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      extraData={handleSongPress}
      ListHeaderComponent={<ExternalAlbumHeader album={album} />}
      ListFooterComponent={footer}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 180 : 140 }}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  statsFooter: {
    paddingHorizontal: H_PADDING,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statsText: {
    fontSize: 13,
  },
});

export default ExternalAlbumContent;
