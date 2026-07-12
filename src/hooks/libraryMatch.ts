import { normalize } from '@/utils/normalize';
import type { Album, AlbumBase, Artist, ExternalAlbumBase, ExternalArtistBase } from '@/types';

// Shared match predicates — reused by ExternalResolutionProvider (pre-navigation
// routing) and useExternalAlbumStatus (in-row "already in library" checkmark) so
// all call sites agree on what counts as the same album/artist.
//
// For Deezer-sourced items, item.id is a Deezer numeric id and never equals a
// MusicBrainz mbid — only item.externalIds?.mbid is safe to compare against a
// local record's mbid field.
export function matchAlbumToLibrary(
  item: ExternalAlbumBase,
  albums: (Album | AlbumBase)[]
): (Album | AlbumBase) | null {
  const normTitle = normalize(item.title);
  const normArtist = normalize(item.artist);
  const mbid = item.externalIds?.mbid;
  return albums.find(a =>
    (mbid && a.mbid && a.mbid === mbid) ||
    (normalize(a.title) === normTitle && normalize(a.artist.name) === normArtist)
  ) ?? null;
}

export function matchArtistToLibrary(
  item: ExternalArtistBase,
  artists: Artist[]
): Artist | null {
  const normName = normalize(item.name);
  const mbid = item.externalIds?.mbid;
  return artists.find(a =>
    (mbid && a.mbid && a.mbid === mbid) ||
    normalize(a.name) === normName
  ) ?? null;
}
