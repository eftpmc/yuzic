import React, { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { Artist, Album, AlbumBase } from '@/types';

import AlbumRow from '@/components/rows/AlbumRow';
import Header from '../Header';
import { selectInternalOnlyEnabled } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  artist: Artist;
};

type CombinedAlbum = (Album | AlbumBase) & {
  isExternal?: boolean;
};

const ESTIMATED_ROW_HEIGHT = 80;

const ArtistContent: React.FC<Props> = ({ artist }) => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const hideUnowned = useSelector(selectInternalOnlyEnabled);

  const mergedAlbums: CombinedAlbum[] = useMemo(() => {
    const owned = artist.ownedAlbums.map(a => ({
      ...a,
      isExternal: false,
    }));

    if (hideUnowned) {
      return owned.sort(
        (a, b) => (b.userPlayCount ?? 0) - (a.userPlayCount ?? 0)
      );
    }

    const ownedMap = new Map(
      owned.map(a => [a.title.toLowerCase(), a])
    );

    const external = (artist.externalAlbums ?? [])
      .filter(a => !ownedMap.has(a.title.toLowerCase()))
      .map(a => ({ ...a, isExternal: true }));

    return [...owned, ...external].sort(
      (a, b) => (b.userPlayCount ?? 0) - (a.userPlayCount ?? 0)
    );
  }, [artist.ownedAlbums, artist.externalAlbums, hideUnowned]);

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