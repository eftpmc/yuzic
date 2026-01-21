import React, { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';

import {
  Artist,
  AlbumBase,
  ExternalAlbumBase,
} from '@/types';

import AlbumRow from '@/components/rows/AlbumRow';
import ExternalAlbumRow from '@/components/rows/ExternalAlbumRow';
import Header from '../Header';

import { useTheme } from '@/hooks/useTheme';
import { useExternalArtist } from '@/hooks/artists/useExternalArtist';

type Props = {
  artist: Artist;
};

type CombinedAlbum =
  | (AlbumBase & { source: 'owned' })
  | (ExternalAlbumBase & { source: 'external' });

const ESTIMATED_ROW_HEIGHT = 80;

const normalizeKey = (artist: string, title: string) =>
  `${artist}:${title}`.toLowerCase().trim();

const ArtistContent: React.FC<Props> = ({ artist }) => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();

  const { data: externalArtist } =
    useExternalArtist(artist);

  const mergedAlbums: CombinedAlbum[] = useMemo(() => {
    const owned: CombinedAlbum[] =
      artist.ownedAlbums.map(a => ({
        ...a,
        source: 'owned',
      }));

    const ownedKeys = new Set(
      owned.map(a =>
        normalizeKey(artist.name, a.title)
      )
    );

    const external: CombinedAlbum[] =
      (externalArtist?.albums ?? [])
        .filter(a => {
          const key = normalizeKey(
            a.artist,
            a.title
          );
          return !ownedKeys.has(key);
        })
        .map(a => ({
          ...a,
          source: 'external',
        }));

    return [...owned, ...external];
  }, [artist, externalArtist?.albums]);

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
              navigation.navigate(
                'albumView',
                { id: album.id }
              )
            }
          />
        ) : (
          <ExternalAlbumRow
            album={item}
            artistName={artist.name}
            onPress={album =>
              navigation.navigate(
                'externalAlbumView',
                {
                  albumId: album.id
                }
              )
            }
          />
        )
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: 140,
        backgroundColor: isDarkMode
          ? '#000'
          : '#fff',
      }}
    />
  );
};

export default ArtistContent;