import { useExternalResolution } from './ExternalResolutionProvider';
import type { ExternalAlbumBase, ExternalArtistBase } from '@/types';

export function useMatchedNavigation() {
  const { resolveAndNavigateToAlbum, resolveAndNavigateToArtist } = useExternalResolution();

  return {
    navigateToAlbum: (item: ExternalAlbumBase) => { void resolveAndNavigateToAlbum(item); },
    navigateToArtist: (item: ExternalArtistBase) => { void resolveAndNavigateToArtist(item); },
  };
}
