import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { InteractionManager } from 'react-native';

import {
  ExternalArtistBase,
  ExternalAlbumBase,
} from '@/types';

import * as listenbrainz from '@/api/listenbrainz';
import * as musicbrainz from '@/api/musicbrainz';
import { resolveArtistMbid } from '@/utils/musicbrainz/resolveArtistMbid';
import { useArtists } from '@/hooks/artists';

const MIN_ARTISTS = 12;
const MIN_ALBUMS = 12;

const MAX_ARTISTS = 24;
const MAX_ALBUM_ARTISTS = 8;

export type ExploreSeedArtist = {
  id?: string;
  name: string;
};

export type ExploreContextType = {
  artistPool: ExternalArtistBase[];
  albumPool: ExternalAlbumBase[];
  isLoading: boolean;
  clear: () => void;
};

const ExploreContext = createContext<ExploreContextType | undefined>(
  undefined
);

export const useExplore = (): ExploreContextType => {
  const ctx = useContext(ExploreContext);
  if (!ctx) {
    throw new Error('useExplore must be used within ExploreProvider');
  }
  return ctx;
};

type Props = {
  children: ReactNode;
};

export const ExploreProvider: React.FC<Props> = ({ children }) => {
  const { artists } = useArtists();

  const [artistPool, setArtistPool] = useState<ExternalArtistBase[]>([]);
  const [albumPool, setAlbumPool] = useState<ExternalAlbumBase[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const clear = useCallback(() => {
    setArtistPool([]);
    setAlbumPool([]);
  }, []);

  const refreshInternal = useCallback(
    async (seedArtists: ExploreSeedArtist[]) => {
      if (!seedArtists.length) return;

      setIsRefreshing(true);
      clear();

      const seedMbids = (
        await Promise.all(
          seedArtists.map(a =>
            resolveArtistMbid(a.id, a.name)
          )
        )
      )
        .filter((m): m is string => !!m)
        .slice(0, 2);

      if (!seedMbids.length) {
        setIsRefreshing(false);
        return;
      }

      const similar = (
        await Promise.all(
          seedMbids.map(mbid =>
            listenbrainz.getSimilarArtists(mbid, {
              limit: MAX_ARTISTS,
            })
          )
        )
      ).flat();

      const artistMbids = Array.from(
        new Set(similar.map(a => a.artist_mbid))
      );

      InteractionManager.runAfterInteractions(async () => {
        const discoveredArtists: ExternalArtistBase[] = [];

        await runSerial(
          artistMbids.slice(0, MAX_ARTISTS),
          async mbid => {
            const artist = await musicbrainz.getArtist(mbid);
            if (!artist) return;

            discoveredArtists.push(artist);
            setArtistPool(prev => mergeArtists(prev, [artist]));
          }
        );

        await runSerial(
          discoveredArtists.slice(0, MAX_ALBUM_ARTISTS),
          async artist => {
            const albums =
              await musicbrainz.getArtistAlbums(
                artist.id,
                artist.name
              );

            setAlbumPool(prev =>
              mergeAlbums(prev, albums)
            );
          }
        );

        setIsRefreshing(false);
      });
    },
    [clear]
  );

  useEffect(() => {
    if (!artists.length) {
      clear();
      return;
    }

    const seeds: ExploreSeedArtist[] = artists
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        name: a.name,
      }));

    refreshInternal(seeds);
  }, [artists.map(a => a.id).join(',')]);

  const isLoading =
    isRefreshing ||
    artistPool.length < MIN_ARTISTS ||
    albumPool.length < MIN_ALBUMS;

  const value = useMemo(
    () => ({
      artistPool,
      albumPool,
      isLoading,
      clear,
    }),
    [artistPool, albumPool, isLoading, clear]
  );

  return (
    <ExploreContext.Provider value={value}>
      {children}
    </ExploreContext.Provider>
  );
};

async function runSerial<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  delayMs = 1100
) {
  for (const item of items) {
    await fn(item);
    await new Promise(r => setTimeout(r, delayMs));
  }
}

function mergeArtists(
  prev: ExternalArtistBase[],
  next: ExternalArtistBase[]
) {
  const map = new Map<string, ExternalArtistBase>();
  prev.forEach(a => map.set(a.id, a));
  next.forEach(a => map.set(a.id, a));
  return Array.from(map.values());
}

function mergeAlbums(
  prev: ExternalAlbumBase[],
  next: ExternalAlbumBase[]
) {
  const map = new Map<string, ExternalAlbumBase>();
  prev.forEach(a =>
    map.set(`${a.artist}-${a.title}`, a)
  );
  next.forEach(a =>
    map.set(`${a.artist}-${a.title}`, a)
  );
  return Array.from(map.values());
}