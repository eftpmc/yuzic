import { useExternalResolution } from './ExternalResolutionProvider';
import type { ExternalAlbumBase, ExternalArtistBase } from '@/types';

type NavigateOptions = { skipLocalMatch?: boolean };

export function useMatchedNavigation() {
  const { resolveAndNavigateToAlbum, resolveAndNavigateToArtist } = useExternalResolution();

  return {
    navigateToAlbum: (item: ExternalAlbumBase, options?: NavigateOptions) => { void resolveAndNavigateToAlbum(item, options); },
    navigateToArtist: (item: ExternalArtistBase, options?: NavigateOptions) => { void resolveAndNavigateToArtist(item, options); },
  };
}
