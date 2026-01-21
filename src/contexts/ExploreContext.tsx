import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useSelector } from 'react-redux';

import {
  ExternalArtistBase,
  ExternalAlbumBase,
} from '@/types';
import { selectLastfmConfig } from '@/utils/redux/selectors/lastfmSelectors';
import * as lastfm from '@/api/lastfm';

const MIN_ARTISTS = 12;
const MIN_ALBUMS = 12;
const ALBUM_ARTIST_SAMPLE = 16;

export type ExploreContextType = {
  artistPool: ExternalArtistBase[];
  albumPool: ExternalAlbumBase[];
  isLoading: boolean;
  refresh: (seedArtists: string[]) => Promise<void>;
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
  const lastfmConfig = useSelector(selectLastfmConfig);

  const [artistPool, setArtistPool] = useState<ExternalArtistBase[]>([]);
  const [albumPool, setAlbumPool] = useState<ExternalAlbumBase[]>([]);

  const clear = useCallback(() => {
    setArtistPool([]);
    setAlbumPool([]);
  }, []);

  const refresh = useCallback(
    async (seedArtists: string[]) => {
      if (!lastfmConfig || seedArtists.length === 0) {
        clear();
        return;
      }

      try {
        const similarResults = await Promise.all(
          seedArtists.map(name =>
            lastfm.getSimilarArtists(lastfmConfig, name, 6)
          )
        );

        const flattenedArtists = similarResults.flat();

        const nextArtistMap = new Map<string, ExternalArtistBase>();

        for (const artist of flattenedArtists) {
          const key = artist.name.toLowerCase();
          if (!nextArtistMap.has(key)) {
            nextArtistMap.set(key, artist);
          }
        }

        const nextArtists = Array.from(nextArtistMap.values());

        setArtistPool(prev => {
          const merged = new Map<string, ExternalArtistBase>();

          for (const a of prev) {
            merged.set(a.name.toLowerCase(), a);
          }

          for (const a of nextArtists) {
            merged.set(a.name.toLowerCase(), a);
          }

          return Array.from(merged.values());
        });

        const artistInfos = await Promise.all(
          nextArtists.slice(0, ALBUM_ARTIST_SAMPLE).map(a =>
            lastfm.getArtistInfo(lastfmConfig, a.name)
          )
        );

        const albums = artistInfos.flatMap(info => info.albums);

        const oneAlbumPerArtist = new Map<string, ExternalAlbumBase>();

        for (const album of albums) {
          const key = album.artist.toLowerCase();
          if (!oneAlbumPerArtist.has(key)) {
            oneAlbumPerArtist.set(key, album);
          }
        }

        setAlbumPool(prev => {
          const merged = new Map<string, ExternalAlbumBase>();

          for (const a of prev) {
            const key = `${a.artist}-${a.title}`.toLowerCase();
            merged.set(key, a);
          }

          for (const a of oneAlbumPerArtist.values()) {
            const key = `${a.artist}-${a.title}`.toLowerCase();
            merged.set(key, a);
          }

          return Array.from(merged.values());
        });
      } catch {
        clear();
      }
    },
    [lastfmConfig, clear]
  );

  const isLoading =
    artistPool.length < MIN_ARTISTS ||
    albumPool.length < MIN_ALBUMS;

  const value = useMemo(
    () => ({
      artistPool,
      albumPool,
      isLoading,
      refresh,
      clear,
    }),
    [artistPool, albumPool, isLoading, refresh, clear]
  );

  return (
    <ExploreContext.Provider value={value}>
      {children}
    </ExploreContext.Provider>
  );
};