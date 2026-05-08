import React, { useCallback, useMemo } from 'react';
import { Dimensions, Platform, Text, View, StyleSheet, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { ExternalAlbum, ExternalAlbumBase, ExternalSong } from '@/types';
import ExternalAlbumHeader from '../Header';
import ExternalSongRow from '@/components/rows/ExternalSongRow';
import MediaTile from '@/screens/explore/components/MediaTile';
import { useExternalAlbumPreviews } from '@/hooks/albums/useExternalAlbumPreviews';
import { usePreviewPlayer, externalSongToTrack } from '@/hooks/usePreviewPlayer';
import { useTheme } from '@/hooks/useTheme';
import * as deezer from '@/api/deezer';
import { QueryKeys } from '@/enums/queryKeys';
import { staleTime } from '@/constants/staleTime';

const H_PADDING = 16;
const TILE_GAP = 12;
const VISIBLE_TILES = 2.5;

type Props = {
  album: ExternalAlbum;
};

const ExternalAlbumContent: React.FC<Props> = ({ album }) => {
  const navigation = useNavigation<any>();
  const { isDarkMode } = useTheme();
  const songs = useMemo(() => album.songs ?? [], [album.songs]);
  const screenWidth = Dimensions.get('window').width;
  const tileWidth = (screenWidth - H_PADDING * 2 - TILE_GAP * 2) / VISIBLE_TILES;
  const previewsRaw = useExternalAlbumPreviews(album);
  const previews = useMemo(
    () => previewsRaw instanceof Map ? previewsRaw : new Map<string, string>(),
    [previewsRaw]
  );
  const { toggleInAlbum } = usePreviewPlayer();

  const artistDeezerId = album.externalIds?.artistDeezerId;
  const artistName = album.artist;

  const { data: moreAlbums } = useQuery({
    queryKey: [QueryKeys.ExternalArtist, 'artist-albums', artistDeezerId ?? artistName ?? ''],
    enabled: !!(artistDeezerId || artistName),
    staleTime: staleTime.musicbrainz,
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
      .filter(s => previews.has(s.id))
      .map(s => externalSongToTrack(s, previews.get(s.id)!)),
    [previews, songs]
  );

  const handleSongPress = useCallback((song: ExternalSong) => {
    const url = previews.get(song.id);
    if (!url) return;
    toggleInAlbum(song, url, albumPreviewSongs, album.id, album.title);
  }, [previews, albumPreviewSongs, toggleInAlbum, album.id, album.title]);

  const header = useMemo(() => <ExternalAlbumHeader album={album} />, [album]);

  const footer = useMemo(() => {
    const totalSec = songs.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const duration = hrs > 0 ? `${hrs} hr ${mins} min` : `${mins} min`;
    const label = songs.length === 1 ? 'song' : 'songs';
    return (
      <View>
        <View style={styles.statsFooter}>
          <Text style={[styles.statsText, isDarkMode ? styles.statsTextDark : styles.statsTextLight]}>
            {songs.length} {label} · {duration}
          </Text>
        </View>
        {moreAlbums && moreAlbums.length > 0 && (
          <View style={styles.moreSection}>
            <Text style={[styles.moreSectionTitle, isDarkMode && styles.moreSectionTitleDark]}>
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
  }, [songs, moreAlbums, album.artist, isDarkMode, tileWidth, navigation]);

  const renderItem = ({ item }: { item: ExternalSong }) => {
    const previewUrl = previews.get(item.id);

    return (
      <ExternalSongRow
        song={item}
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
      ListHeaderComponent={header}
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
  statsTextLight: {
    color: '#8e8e93',
  },
  statsTextDark: {
    color: '#666',
  },
  moreSection: {
    paddingTop: 24,
    paddingBottom: 8,
  },
  moreSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    paddingHorizontal: H_PADDING,
    marginBottom: 12,
  },
  moreSectionTitleDark: {
    color: '#fff',
  },
  moreTileRow: {
    paddingHorizontal: H_PADDING,
    gap: TILE_GAP,
  },
});

export default ExternalAlbumContent;
