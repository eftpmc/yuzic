import React, { useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { makeSelectOwnedAlbums } from '@/utils/redux/makeSelectOwnedAlbums'
import { useSelector } from 'react-redux';

import { Artist, Album, AlbumBase } from '@/types';
import { RootState } from '@/utils/redux/store';
import { useLibrary } from '@/contexts/LibraryContext';

import AlbumRow from '@/components/AlbumRow';
import Header from './Header';

type Props = {
  artist: Artist;
};

type CombinedAlbum = (Album | AlbumBase) & {
  isExternal?: boolean;
};

const ESTIMATED_ROW_HEIGHT = 80;

const List: React.FC<Props> = ({ artist }) => {
  const navigation = useNavigation();
  const isDarkMode = useColorScheme() === 'dark';
  const { getAlbum } = useLibrary();
  const selectOwnedAlbums = useMemo(makeSelectOwnedAlbums, []);

  const ownedAlbums = useSelector((state: RootState) =>
    selectOwnedAlbums(state, artist)
  );

  useEffect(() => {
    artist.ownedAlbums.forEach(a => {
      getAlbum(a.id);
    });
  }, [artist.id]);

  const mergedAlbums: CombinedAlbum[] = useMemo(() => {
    const ownedMap = new Map(
      ownedAlbums.map(a => [
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