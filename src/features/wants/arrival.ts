import { normalize } from '@/utils/normalize';
import { matchAlbumToLibrary } from '@/hooks/libraryMatch';
import type { Want } from '@/utils/redux/slices/wantsSlice';
import type { AlbumBase, ExternalAlbumBase, SongBase } from '@/types';

/**
 * The minimal library snapshot arrival detection needs: albums are matched
 * via the shared `matchAlbumToLibrary` matcher, tracks (when supplied) via
 * normalized title+artist — same normalization used everywhere else in the
 * repo (`@/utils/normalize`), no new fuzzy algorithm.
 */
export interface ArrivalLibrary {
  albums: AlbumBase[];
  tracks?: SongBase[];
}

function trackArrived(want: Want, tracks: SongBase[]): boolean {
  const normTitle = normalize(want.title);
  const normArtist = normalize(want.artist);
  return tracks.some(
    (track) => normalize(track.title) === normTitle && normalize(track.artist) === normArtist
  );
}

/**
 * Presence-based arrival check: a want has "arrived" once its entity is
 * actually findable in the synced library — never inferred from a downloader
 * queue disappearing. Reuses the same matchers the rest of the app already
 * trusts for "is this in my library" (`matchAlbumToLibrary`) so an album want
 * resolves via the identical mbid-first / normalized-title+artist rule as
 * everywhere else, and a track want resolves via the same normalization.
 *
 * Pure and side-effect-free: callers (the watcher hook) own dispatching
 * `removeWant` and toasting once a want is reported as arrived here.
 */
export function findArrivedWants(wants: Want[], library: ArrivalLibrary): Want[] {
  const tracks = library.tracks ?? [];
  return wants.filter((want) => {
    if (want.unit === 'album') {
      const asExternalAlbum: ExternalAlbumBase = {
        id: want.localId,
        title: want.title,
        artist: want.artist,
        cover: { kind: 'none' },
        subtext: want.artist,
        externalIds: want.externalIds,
      };
      return matchAlbumToLibrary(asExternalAlbum, library.albums) !== null;
    }
    return trackArrived(want, tracks);
  });
}
