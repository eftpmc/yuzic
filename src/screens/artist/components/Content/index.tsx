import React, { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';

import { Artist, Album, AlbumBase } from '@/types';

import AlbumRow from '@/components/AlbumRow';
import Header from '../Header';

type Props = {
  artist: Artist;
};

type CombinedAlbum = (Album | AlbumBase) & {
  isExternal?: boolean;
};

const ESTIMATED_ROW_HEIGHT = 80;

const ArtistContent: React.FC<Props> = ({ artist }) => {
  const navigation = useNavigation();
  const isDarkMode = useColorScheme() === 'dark';

  const mergedAlbums: CombinedAlbum[] = useMemo(() => {
    const ownedMap = new Map(
      artist.ownedAlbums.map(a => [
        a.title.toLowerCase(),
        { ...a, isExternal: false },
      ])
    );

    const external = (artist.externalAlbums ?? []).filter(
      a => !ownedMap.has(a.title.toLowerCase())
    );

    return [
      ...Array.from(ownedMap.values()),
      ...external.map(a => ({ ...a, isExternal: true })),
    ].sort((a, b) => (b.userPlayCount ?? 0) - (a.userPlayCount ?? 0));
  }, [artist.ownedAlbums, artist.externalAlbums]);

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

export default ArtistContent;