import { useMemo } from 'react';
import { useLibrary } from '@/contexts/LibraryContext';
import { useArtists } from '@/hooks/artists';
import { normalize } from '@/utils/normalize';
import type { ExternalAlbumBase, ExternalArtistBase } from '@/types';

export function useAlbumLibraryMatch(item: ExternalAlbumBase | null): string | null {
  const { albums } = useLibrary();

  return useMemo(() => {
    if (!item) return null;
    const normTitle = normalize(item.title);
    const normArtist = normalize(item.artist);
    const match = albums.find(a =>
      (item.id && a.mbid && a.mbid === item.id) ||
      (normalize(a.title) === normTitle && normalize(a.artist.name) === normArtist)
    );
    return match?.id ?? null;
  }, [albums, item]);
}

export function useArtistLibraryMatch(item: ExternalArtistBase | null): string | null {
  const { artists } = useArtists();

  return useMemo(() => {
    if (!item) return null;
    const normName = normalize(item.name);
    const match = artists.find(a =>
      (item.externalIds?.mbid && a.mbid && a.mbid === item.externalIds.mbid) ||
      normalize(a.name) === normName
    );
    return match?.id ?? null;
  }, [artists, item]);
}
