import React, { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';

import { Artist, Album, AlbumBase } from '@/types';
import AlbumRow from '@/components/rows/AlbumRow';
import Header from '../Header';

import { selectLastfmConfig } from '@/utils/redux/selectors/lastfmSelectors';
import { useTheme } from '@/hooks/useTheme';
import { staleTime } from '@/constants/staleTime';
import * as lastfm from '@/api/lastfm';
import { QueryKeys } from '@/enums/queryKeys';

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
  const lastfmConfig = useSelector(selectLastfmConfig);

  const { data: lastfmData } = useQuery({
    queryKey: [QueryKeys.LastfmArtist, artist.name],
    queryFn: () =>
      lastfmConfig
        ? lastfm.getArtistInfo(lastfmConfig, artist.name)
        : null,
    staleTime: staleTime.lastfm,
    enabled: !!lastfmConfig,
  });

  const mergedAlbums: CombinedAlbum[] = useMemo(() => {
    const owned = artist.ownedAlbums.map(a => ({
      ...a,
      isExternal: false,
    }));

    if (!lastfmConfig) {
      return owned.sort(
        (a, b) => (b.userPlayCount ?? 0) - (a.userPlayCount ?? 0)
      );
    }

    const ownedMap = new Map(
      owned.map(a => [a.title.toLowerCase(), true])
    );

    const external = (lastfmData?.albums ?? [])
      .filter(a => !ownedMap.has(a.title.toLowerCase()))
      .map(a => ({ ...a, isExternal: true }));

    return [...owned, ...external].sort(
      (a, b) => (b.userPlayCount ?? 0) - (a.userPlayCount ?? 0)
    );
  }, [artist.ownedAlbums, lastfmData?.albums, lastfmConfig]);

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