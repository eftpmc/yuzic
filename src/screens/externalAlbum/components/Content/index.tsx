import React, { useCallback, useMemo } from 'react';
import { Platform, Text, View, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { ExternalAlbum, ExternalAlbumBase, ExternalSong } from '@/types';
import ExternalAlbumHeader from '../Header';
import ExternalSongRow from '@/components/rows/ExternalSongRow';
import MediaTile from '@/screens/home/components/MediaTile';
import { useExternalAlbumPreviews } from '@/hooks/albums/useExternalAlbumPreviews';
import { usePreviewPlayer, externalSongToTrack } from '@/hooks/usePreviewPlayer';
import { useTheme } from '@/hooks/useTheme';
import * as deezer from '@/api/deezer';
import { QueryKeys } from '@/enums/queryKeys';

const H_PADDING = 16;
const TILE_GAP = 12;
const VISIBLE_TILES = 2.5;

type Props = {
  album: ExternalAlbum;
};

const ExternalAlbumContent: React.FC<Props> = ({ album }) => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const songs = useMemo(() => album.songs ?? [], [album.songs]);
  const { width: screenWidth } = useWindowDimensions();
  const tileWidth = useMemo(
    () => (screenWidth - H_PADDING * 2 - TILE_GAP * 2) / VISIBLE_TILES,
    [screenWidth]
  );
  const previews = useExternalAlbumPreviews(album);
  const { toggleInAlbum } = usePreviewPlayer();

  const artistDeezerId = album.externalIds?.artistDeezerId;
  const artistName = album.artist;

  const { data: moreAlbums } = useQuery({
    queryKey: [QueryKeys.ExternalArtist, 'artist-albums', artistDeezerId ?? artistName ?? ''],
    enabled: !!(artistDeezerId || artistName),
    staleTime: 1000 * 60 * 60 * 24,
    queryFn: async () => {
      let deezerId = artistDeezerId;
      if (!deezerId && artistName) {
        const resolved = await deezer.resolveDeezerArtistByName(artistName);
        deezerId = resolved?.externalIds?.deezerId;
      }
      if (!deezerId) return [];
      const fallbackArtist = artistName
        ? {
            id: deezerId,
            name: artistName,
            subtext: '',
            cover: { kind: 'none' as const },
            externalSource: 'deezer' as const,
            externalIds: { deezerId },
          }
        : null;
      return deezer.getDeezerArtistAlbums(deezerId, 50, fallbackArtist);
    },
    select: (albums) => albums.filter(a => a.id !== album.id),
  });

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
      <View>
        <View style={styles.statsFooter}>
          <Text style={[styles.statsText, { color: colors.subtext }]}>
            {songs.length} {label} · {duration}
          </Text>
        </View>
        {moreAlbums && moreAlbums.length > 0 && (
          <View style={styles.moreSection}>
            <Text style={[styles.moreSectionTitle, { color: colors.secondary }]}>
              More by {album.artist}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.moreTileRow}
            >
              {moreAlbums.map((a: ExternalAlbumBase) => (
                <MediaTile
                  key={a.id}
                  cover={a.cover}
                  title={a.title}
                  subtitle={a.subtext ?? ''}
                  size={tileWidth}
                  radius={6}
                  onPress={() => navigation.navigate('externalAlbumView', {
                    source: a.externalSource,
                    albumId: a.id,
                  })}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  }, [songs, moreAlbums, album.artist, colors, tileWidth, navigation]);

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
  moreSection: {
    paddingTop: 24,
    paddingBottom: 8,
  },
  moreSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: H_PADDING,
    marginBottom: 12,
  },
  moreTileRow: {
    paddingHorizontal: H_PADDING,
    gap: TILE_GAP,
  },
});

export default ExternalAlbumContent;
