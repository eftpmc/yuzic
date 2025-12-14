import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';

import { ArtistData, AlbumData } from '@/types';
import { useApi } from '@/api';

import AlbumRow from '@/components/AlbumRow';
import Header from './Header';

type Props = {
  artist: ArtistData;
};

type CombinedAlbum = AlbumData & {
  isExternal?: boolean;
};

const ESTIMATED_ROW_HEIGHT = 80;

const List: React.FC<Props> = ({ artist }) => {
  const api = useApi();
  const navigation = useNavigation();
  const isDarkMode = useColorScheme() === 'dark';

  const [ownedAlbums, setOwnedAlbums] = useState<AlbumData[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadAlbums = async () => {
      try {
        const albums: AlbumData[] = [];

        for (const albumId of artist.ownedIds) {
          const album = await api.albums.get(albumId);
          if (album) albums.push(album);
        }

        if (mounted) setOwnedAlbums(albums);
      } finally {
        /* noop */
      }
    };

    loadAlbums();

    return () => {
      mounted = false;
    };
  }, [artist.id]);

  const mergedAlbums: CombinedAlbum[] = useMemo(() => {
    const ownedMap = new Map(
      ownedAlbums.map(a => [
        a.title.toLowerCase(),
        { ...a, isExternal: false },
      ]),
    );

    const external = (artist.externalAlbums ?? []).filter(
      a => !ownedMap.has(a.title.toLowerCase()),
    );

    return [
      ...Array.from(ownedMap.values()),
      ...external.map(a => ({ ...a, isExternal: true })),
    ].sort((a, b) => (b.userPlayCount ?? 0) - (a.userPlayCount ?? 0));
  }, [ownedAlbums, artist.externalAlbums]);

  const navigateToAlbum = (album: CombinedAlbum) => {
    if (album.isExternal) return;
    navigation.navigate('albumView', { id: album.id });
  };

  return (
    <FlashList
      data={mergedAlbums}
      keyExtractor={item => item.id}
      estimatedItemSize={ESTIMATED_ROW_HEIGHT}
      ListHeaderComponent={<Header artist={artist} />}
      renderItem={({ item }) => (
        <AlbumRow
          album={item}
          artistName={artist.name}
          onPress={navigateToAlbum}
        />
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: 140,
        backgroundColor: isDarkMode ? '#000' : '#fff',
      }}
    />
  );
};

export default List;