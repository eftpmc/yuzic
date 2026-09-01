import React, { useCallback, useMemo } from 'react';
import { Platform, Text, View, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';

import { Album, Song } from '@/types';

import AlbumHeader, { AlbumHeaderBar } from '../Header';
import SongRow from '@/components/rows/SongRow';
import LoadingSongRow from '@/components/rows/SongRow/Loading';
import MediaTile from '@/screens/home/components/MediaTile';
import { useTheme } from '@/hooks/useTheme';
import { useArtistAlbums } from '@/hooks/artists';
import { useStarredSongs } from '@/hooks/starred';
import { useSelector } from 'react-redux';
import { selectAlbumPlayCount } from '@/utils/redux/selectors/statsSelectors';
import AlbumRecommendedSection from '../AlbumRecommendedSection';
import {
  ALBUM_ESTIMATED_ROW_HEIGHT,
  ALBUM_DISC_HEADER_HEIGHT,
  ALBUM_RECOMMENDATION_HORIZONTAL_PADDING,
  ALBUM_RECOMMENDATION_TILE_GAP,
  ALBUM_RECOMMENDATION_VISIBLE_TILES,
} from '@/constants/album';
import { typography } from '@/constants/design';

type Props = {
  album: Album;
  songsLoading?: boolean;
};

type DiscHeader = { type: 'disc-header'; disc: number };
type SongItem = { type: 'song'; song: Song };
type SkeletonItem = { type: 'skeleton'; id: string };
type ListItem = DiscHeader | SongItem | SkeletonItem;

const LocalAlbumBody: React.FC<Props> = ({ album, songsLoading }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const artistAlbums = useArtistAlbums(album.artist?.id ?? '');
  const { songs: starredSongs } = useStarredSongs();
  const albumPlayCount = useSelector(selectAlbumPlayCount(album.id));
  const { width: screenWidth } = useWindowDimensions();
  const tileWidth = (screenWidth - ALBUM_RECOMMENDATION_HORIZONTAL_PADDING * 2 - ALBUM_RECOMMENDATION_TILE_GAP * 2) / ALBUM_RECOMMENDATION_VISIBLE_TILES;
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
    const duration = hrs > 0
      ? t('album.duration.hrMin', { hrs, mins })
      : t('album.duration.min', { mins });
    const songLabel = t(songs.length === 1 ? 'common.song' : 'common.songs');
    const playLabel = t(albumPlayCount === 1 ? 'album.play' : 'album.plays');
    return (
      <View>
        <View style={styles.statsFooter}>
          <Text style={[styles.statsText, { color: colors.subtext }]}>
            {songs.length} {songLabel} · {duration}{albumPlayCount > 0 ? ` · ${albumPlayCount} ${playLabel}` : ''}
          </Text>
        </View>
        {moreAlbums.length > 0 && (
          <View style={styles.moreSection}>
            <Text style={[styles.moreSectionTitle, { color: colors.secondary }]}>
              {t('album.moreBy', { name: album.artist?.name })}
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
                  onPress={() => navigation.push('albumView', { id: a.id })}
                />
              ))}
            </ScrollView>
          </View>
        )}
        {album.artist?.name && (
          <AlbumRecommendedSection
            artistName={album.artist.name}
            excludeAlbumId={album.id}
          />
        )}
      </View>
    );
  }, [album.songs, album.artist, album.id, albumPlayCount, colors, moreAlbums, tileWidth, navigation, t]);

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
          {t('album.disc', { number: item.disc })}
        </Text>
      );
    }

    return (
      <SongRow
        song={item.song}
        collection={album}
        variant="albumCompact"
        isFavorite={starredSongIds.has(item.song.id)}
      />
    );
  }, [colors, starredSongIds, album, t]);

  return (
    <View style={styles.listContainer}>
      <AlbumHeaderBar localAlbum={album} externalAlbum={null} />
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
            item.type === 'disc-header' ? ALBUM_DISC_HEADER_HEIGHT : ALBUM_ESTIMATED_ROW_HEIGHT;
        }}
        ListHeaderComponent={<AlbumHeader localAlbum={album} externalAlbum={null} showNavigation={false} />}
        ListFooterComponent={footer}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 180 : 140 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
  },
  discHeader: {
    ...typography.caption,
    fontWeight: '600',
    height: ALBUM_DISC_HEADER_HEIGHT,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  statsFooter: {
    paddingHorizontal: ALBUM_RECOMMENDATION_HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statsText: {
    ...typography.caption,
  },
  moreSection: {
    paddingTop: 24,
    paddingBottom: 8,
  },
  moreSectionTitle: {
    ...typography.sectionTitle,
    paddingHorizontal: ALBUM_RECOMMENDATION_HORIZONTAL_PADDING,
    marginBottom: 12,
  },
  moreTileRow: {
    paddingHorizontal: ALBUM_RECOMMENDATION_HORIZONTAL_PADDING,
    gap: ALBUM_RECOMMENDATION_TILE_GAP,
  },
});

export default LocalAlbumBody;
