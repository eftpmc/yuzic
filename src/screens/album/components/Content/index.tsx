import React, { useCallback, useMemo } from 'react';
import { Platform, Text, View, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';

import { Album, Song } from '@/types';

import AlbumHeader from '../Header';
import SongRow from '@/components/rows/SongRow';
import LoadingSongRow from '@/components/rows/SongRow/Loading';
import MediaTile from '@/screens/home/components/MediaTile';
import { useTheme } from '@/hooks/useTheme';
import { useArtistAlbums } from '@/hooks/artists';
import { useStarredSongs } from '@/hooks/starred';
import { useSelector } from 'react-redux';
import { selectAlbumPlayCount } from '@/utils/redux/selectors/statsSelectors';
import { useDeezerAlbumPreviewsEnabled } from '@/features/home/hooks/useDeezerEnabled';
import { useLocalAlbumPreviews } from '@/hooks/albums/useLocalAlbumPreviews';
import { usePreviewPlayer, externalSongToTrack } from '@/hooks/usePreviewPlayer';
import AlbumRecommendedSection from '../AlbumRecommendedSection';

type Props = {
  album: Album;
  songsLoading?: boolean;
};

type DiscHeader = { type: 'disc-header'; disc: number };
type SongItem = { type: 'song'; song: Song };
type SkeletonItem = { type: 'skeleton'; id: string };
type ListItem = DiscHeader | SongItem | SkeletonItem;

const ESTIMATED_ROW_HEIGHT = 72;
const DISC_HEADER_HEIGHT = 36;
const H_PADDING = 16;
const TILE_GAP = 12;
const VISIBLE_TILES = 2.5;

const AlbumContent: React.FC<Props> = ({ album, songsLoading }) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const artistAlbums = useArtistAlbums(album.artist?.id ?? '');
  const { songs: starredSongs } = useStarredSongs();
  const albumPlayCount = useSelector(selectAlbumPlayCount(album.id));
  const previewsEnabled = useDeezerAlbumPreviewsEnabled();
  const previews = useLocalAlbumPreviews({ album, enabled: previewsEnabled });
  const { toggleInAlbum } = usePreviewPlayer();

  const previewQueue = useMemo(() =>
    (album.songs ?? [])
      .filter(s => !!previews[s.id])
      .map(s => externalSongToTrack(
        { id: s.id, title: s.title, artist: s.artist ?? '', cover: s.cover, duration: s.duration, albumId: s.albumId, previewUrl: previews[s.id] },
        previews[s.id]
      )),
    [album.songs, previews]
  );

  const { width: screenWidth } = useWindowDimensions();
  const tileWidth = (screenWidth - H_PADDING * 2 - TILE_GAP * 2) / VISIBLE_TILES;
  const starredSongIds = useMemo(
    () => new Set(starredSongs.map(song => song.id)),
    [starredSongs]
  );

  const moreAlbums = useMemo(() => {
    return artistAlbums.filter(a => a.id !== album.id);
  }, [artistAlbums, album.id]);

  const footer = useMemo(() => {
    const songs = album.songs ?? [];
    const totalSec = songs.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const duration = hrs > 0 ? `${hrs} hr ${mins} min` : `${mins} min`;
    const label = songs.length === 1 ? 'song' : 'songs';
    return (
      <View>
        <View style={styles.statsFooter}>
          <Text style={[styles.statsText, { color: colors.subtext }]}>
            {songs.length} {label} · {duration}{albumPlayCount > 0 ? ` · ${albumPlayCount} ${albumPlayCount === 1 ? 'play' : 'plays'}` : ''}
          </Text>
        </View>
        {moreAlbums.length > 0 && (
          <View style={styles.moreSection}>
            <Text style={[styles.moreSectionTitle, { color: colors.secondary }]}>
              More by {album.artist?.name}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.moreTileRow}
            >
              {moreAlbums.map(a => (
                <MediaTile
                  key={a.id}
                  cover={a.cover}
                  title={a.title}
                  subtitle={a.subtext || String(a.year || '')}
                  size={tileWidth}
                  radius={6}
                  onPress={() => navigation.navigate('albumView', { id: a.id })}
                />
              ))}
            </ScrollView>
          </View>
        )}
        {album.artist?.name && (
          <AlbumRecommendedSection
            artistName={album.artist.name}
            artistId={album.artist.id}
            excludeAlbumId={album.id}
          />
        )}
      </View>
    );
  }, [album.songs, album.artist, album.id, albumPlayCount, colors, moreAlbums, tileWidth, navigation]);

  const items = useMemo<ListItem[]>(() => {
    if (songsLoading) {
      return Array.from({ length: 8 }, (_, i) => ({ type: 'skeleton' as const, id: `sk-${i}` }));
    }

    const songs = album.songs ?? [];
    const hasMultipleDiscs = new Set(songs.map((song) => song.disc ?? 1)).size > 1;

    if (!hasMultipleDiscs) {
      return songs.map((song) => ({ type: 'song', song }));
    }

    const listItems: ListItem[] = [];
    let currentDisc: number | null = null;

    songs.forEach((song) => {
      const disc = song.disc ?? 1;

      if (disc !== currentDisc) {
        currentDisc = disc;
        listItems.push({ type: 'disc-header', disc });
      }

      listItems.push({ type: 'song', song });
    });

    return listItems;
  }, [album.songs, songsLoading]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'skeleton') {
      return <LoadingSongRow />;
    }

    if (item.type === 'disc-header') {
      return (
        <Text style={[styles.discHeader, { color: colors.subtext }]}>
          Disc {item.disc}
        </Text>
      );
    }

    const previewUrl = previews[item.song.id];
    return (
      <SongRow
        song={item.song}
        collection={album}
        variant="albumCompact"
        isFavorite={starredSongIds.has(item.song.id)}
        onPreviewPress={previewUrl
          ? () => toggleInAlbum(
              { id: item.song.id, title: item.song.title, artist: item.song.artist ?? '', cover: item.song.cover, duration: item.song.duration, albumId: item.song.albumId, previewUrl },
              previewUrl,
              previewQueue,
              album.id,
              album.title,
            )
          : undefined}
      />
    );
  }, [colors, starredSongIds, album, previews, previewQueue, toggleInAlbum]);

  return (
    <FlashList
      data={items}
      keyExtractor={(item) =>
        item.type === 'disc-header' ? `disc-${item.disc}` :
        item.type === 'skeleton' ? item.id :
        item.song.id
      }
      renderItem={renderItem}
      extraData={starredSongIds}
      getItemType={(item) => item.type}
      overrideItemLayout={(layout, item) => {
        (layout as { size?: number }).size =
          item.type === 'disc-header' ? DISC_HEADER_HEIGHT : ESTIMATED_ROW_HEIGHT;
      }}
      ListHeaderComponent={<AlbumHeader album={album} />}
      ListFooterComponent={footer}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 180 : 140 }}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  discHeader: {
    height: DISC_HEADER_HEIGHT,
    paddingHorizontal: 16,
    paddingTop: 14,
    fontSize: 13,
    fontWeight: '600',
  },
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

export default AlbumContent;
