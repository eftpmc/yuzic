import React, { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';

import {
  Artist,
  AlbumBase,
  ExternalAlbumBase,
} from '@/types';
import AlbumRow from '@/components/rows/AlbumRow';
import Header from '../Header';

import { selectLastfmConfig } from '@/utils/redux/selectors/lastfmSelectors';
import { useTheme } from '@/hooks/useTheme';
import { staleTime } from '@/constants/staleTime';
import * as lastfm from '@/api/lastfm';
import { QueryKeys } from '@/enums/queryKeys';
import ExternalAlbumRow from '@/components/rows/ExternalAlbumRow';

type Props = {
  artist: Artist;
};

type CombinedAlbum =
  | (AlbumBase & { source: 'owned' })
  | (ExternalAlbumBase & { source: 'external' });

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
        : Promise.resolve(null),
    staleTime: staleTime.lastfm,
    enabled: !!lastfmConfig,
  });

  const mergedAlbums: CombinedAlbum[] = useMemo(() => {
    const owned: CombinedAlbum[] = artist.ownedAlbums.map(a => ({
      ...a,
      source: 'owned',
    }));

    const ownedTitles = new Set(
      owned.map(a => a.title.toLowerCase())
    );

    const external: CombinedAlbum[] = (lastfmData?.albums ?? [])
      .filter(a => !ownedTitles.has(a.title.toLowerCase()))
      .map(a => ({
        ...a,
        source: 'external',
      }));

    return [...owned, ...external];
  }, [artist.ownedAlbums, lastfmData?.albums]);

  return (
    <FlashList
      data={mergedAlbums}
      keyExtractor={item => item.id}
      estimatedItemSize={ESTIMATED_ROW_HEIGHT}
      ListHeaderComponent={<Header artist={artist} />}
      renderItem={({ item }) =>
        item.source === 'owned' ? (
          <AlbumRow
            album={item}
            onPress={album =>
              navigation.navigate('albumView', { id: album.id })
            }
          />
        ) : (
          <ExternalAlbumRow
            album={item}
            artistName={artist.name}
            onPress={album =>
              navigation.navigate('externalAlbumView', {
                album: album.title,
                artist: artist.name,
              })
            }
          />
        )
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: 140,
        backgroundColor: isDarkMode ? '#000' : '#fff',
      }}
    />
  );
};

export default ArtistContent;