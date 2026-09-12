import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { useLibrary } from '@/contexts/LibraryContext';
import { matchAlbumToLibrary } from '@/hooks/libraryMatch';
import type { ExternalAlbumBase } from '@/types';
import type { LibraryState } from '@/types/LibraryState';
import {
  selectLidarrAuthenticated,
  selectSlskdAuthenticated,
} from '@/utils/redux/selectors/downloadersSelectors';
import { resolveLibraryState } from './resolveLibraryState';

/**
 * Thin React wrapper around `resolveLibraryState`: assembles
 * `LibraryStateFacts` for a given external album from redux/context state,
 * then hands off to the pure resolver. All state-source decisions live
 * here; precedence logic stays in the pure function.
 */
export function useLibraryState(album: ExternalAlbumBase | null): LibraryState {
  const { albums: libraryAlbums } = useLibrary();
  const isLidarrConnected = useSelector(selectLidarrAuthenticated);
  const isSlskdConnected = useSelector(selectSlskdAuthenticated);

  const isInLibrary = useMemo(() => {
    if (!album) return false;
    return matchAlbumToLibrary(album, libraryAlbums) !== null;
  }, [album, libraryAlbums]);

  const hasAcquisitionProvider = isLidarrConnected || isSlskdConnected;
  const isExternalOrigin = !!album?.externalSource;

  return useMemo(
    () =>
      resolveLibraryState({
        isInLibrary,
        // TODO(Phase C): read wantsSlice
        isWanted: false,
        hasAcquisitionProvider,
        isExternalOrigin,
      }),
    [isInLibrary, hasAcquisitionProvider, isExternalOrigin]
  );
}
