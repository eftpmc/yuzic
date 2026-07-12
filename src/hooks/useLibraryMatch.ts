import { useMemo } from 'react';
import { useLibrary } from '@/contexts/LibraryContext';
import { useArtists } from '@/hooks/artists';
import { matchAlbumToLibrary, matchArtistToLibrary } from '@/hooks/libraryMatch';
import type { ExternalAlbumBase, ExternalArtistBase } from '@/types';

export function useAlbumLibraryMatch(item: ExternalAlbumBase | null): string | null {
  const { albums } = useLibrary();

  return useMemo(() => {
    if (!item) return null;
    return matchAlbumToLibrary(item, albums)?.id ?? null;
  }, [albums, item]);
}

export function useArtistLibraryMatch(item: ExternalArtistBase | null): string | null {
  const { artists } = useArtists();

  return useMemo(() => {
    if (!item) return null;
    return matchArtistToLibrary(item, artists)?.id ?? null;
  }, [artists, item]);
}
