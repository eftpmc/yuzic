/**
 * Candidate selection for Soulseek downloads.
 *
 * Soulseek search is fuzzy: a search for "<artist> <album>" also returns users
 * who matched on the artist alone, so their shares are full of *other* albums.
 * Picking the biggest directory from the biggest sharer therefore queues a
 * plausible-looking but wrong release. Everything here exists to make the
 * chosen directory prove it is the album that was asked for — the same bar
 * `downloadTrack` already holds single files to.
 */

import type { SlskdSearchPreferences } from '../client';
import { DEFAULT_SLSKD_PREFERENCES } from '../client';

export const ALLOWED_EXTENSIONS = ['flac', 'mp3'];

export type SearchFile = {
  filename: string;
  size: number;
  code: number;
  isLocked: boolean;
  extension: string;
  bitRate?: number;
  bitDepth?: number;
};

export type SearchResponseItem = {
  username: string;
  files: SearchFile[];
  hasFreeUploadSlot?: boolean;
  lockedFileCount?: number;
  queueLength?: number;
};

export type DirectoryCandidate = {
  username: string;
  hasFreeUploadSlot: boolean;
  directory: string;
  files: SearchFile[];
  /** True when the artist name also appears in the directory path. */
  artistMatches: boolean;
};

export function ext(path: string): string {
  const i = path.lastIndexOf('.');
  return i < 0 ? '' : path.slice(i + 1).toLowerCase();
}

export function basename(path: string): string {
  const normalized = path.replace(/\//g, '\\');
  const i = normalized.lastIndexOf('\\');
  return i < 0 ? normalized : normalized.slice(i + 1);
}

export function dirname(path: string): string {
  const normalized = path.replace(/\//g, '\\');
  const i = normalized.lastIndexOf('\\');
  return i < 0 ? '' : normalized.slice(0, i);
}

/**
 * Strips accents and everything that isn't a letter or digit, so "Sigur Rós –
 * ( )" and "sigur ros ()" compare equal. Matches the normaliser the Lidarr
 * resolver uses, for one notion of "same title" across both downloaders.
 */
export function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function playableFiles(
  response: SearchResponseItem,
  prefs: SlskdSearchPreferences = DEFAULT_SLSKD_PREFERENCES
): SearchFile[] {
  return (response.files ?? []).filter(file => {
    if (file.isLocked) return false;
    const extension = ext(file.filename ?? '');
    if (!ALLOWED_EXTENSIONS.includes(extension)) return false;
    // A strict "flac only" preference should not fall back to mp3 — that is
    // the whole point of setting it. Users who accept either keep 'auto'.
    if (prefs.preferredFormat === 'flac' && extension !== 'flac') return false;
    // A missing bitrate stays in: many slskd peers just don't report it and
    // dropping them would leave the picker with nothing to choose from.
    if (
      extension === 'mp3' &&
      prefs.minBitrateKbps > 0 &&
      typeof file.bitRate === 'number' &&
      file.bitRate < prefs.minBitrateKbps
    ) {
      return false;
    }
    return true;
  });
}

function flacShare(files: SearchFile[]): number {
  if (files.length === 0) return 0;
  const flacs = files.filter(file => ext(file.filename ?? '') === 'flac').length;
  return flacs / files.length;
}

/**
 * Groups a user's playable files by the directory they live in. A Soulseek
 * response mixes every matching file across a user's whole share, so the
 * directory is the only thing that delimits one release from the next.
 */
export function groupByDirectory(
  response: SearchResponseItem,
  normalizedAlbum: string,
  normalizedArtist: string,
  prefs: SlskdSearchPreferences = DEFAULT_SLSKD_PREFERENCES
): DirectoryCandidate[] {
  const byDirectory = new Map<string, SearchFile[]>();
  for (const file of playableFiles(response, prefs)) {
    const directory = dirname(file.filename ?? '');
    const existing = byDirectory.get(directory);
    if (existing) existing.push(file);
    else byDirectory.set(directory, [file]);
  }

  const candidates: DirectoryCandidate[] = [];
  byDirectory.forEach((files, directory) => {
    const normalizedDirectory = normalize(directory);
    // A release folder normally carries the album title; some shares only put
    // it on the files themselves, so accept either as proof of the album.
    const titleInDirectory =
      !!normalizedAlbum && normalizedDirectory.includes(normalizedAlbum);
    const titleInEveryFile =
      !!normalizedAlbum &&
      files.every(file => normalize(basename(file.filename ?? '')).includes(normalizedAlbum));
    if (!titleInDirectory && !titleInEveryFile) return;

    candidates.push({
      username: response.username,
      hasFreeUploadSlot: response.hasFreeUploadSlot === true,
      directory,
      files,
      artistMatches:
        !!normalizedArtist && normalizedDirectory.includes(normalizedArtist),
    });
  });
  return candidates;
}

/**
 * Picks the directory most likely to be the requested release, or `null` when
 * nothing in the results actually names it — the caller reports that as a miss
 * rather than queueing a different album.
 */
export function selectAlbumDirectory(
  responses: SearchResponseItem[],
  albumTitle: string,
  artistName: string,
  prefs: SlskdSearchPreferences = DEFAULT_SLSKD_PREFERENCES
): DirectoryCandidate | null {
  const normalizedAlbum = normalize(albumTitle);
  const normalizedArtist = normalize(artistName);
  if (!normalizedAlbum) return null;

  const candidates = responses.flatMap(response =>
    groupByDirectory(response, normalizedAlbum, normalizedArtist, prefs)
  );
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    // Artist first: among folders that all name the album, the one that also
    // names the artist is the one least likely to be a cover or a compilation.
    if (a.artistMatches !== b.artistMatches) return a.artistMatches ? -1 : 1;
    if (prefs.preferFreeSlot && a.hasFreeUploadSlot !== b.hasFreeUploadSlot) {
      return a.hasFreeUploadSlot ? -1 : 1;
    }
    const flacDelta = flacShare(b.files) - flacShare(a.files);
    if (Math.abs(flacDelta) > 0.001) return flacDelta;
    // More files means fewer gaps in the release, not a bigger sharer: these
    // candidates are already scoped to a single directory.
    if (a.files.length !== b.files.length) return b.files.length - a.files.length;
    return a.directory.localeCompare(b.directory);
  });

  return candidates[0];
}

export type TrackCandidate = {
  username: string;
  hasFreeUploadSlot: boolean;
  file: SearchFile;
};

export function selectTrackFile(
  responses: SearchResponseItem[],
  trackTitle: string,
  prefs: SlskdSearchPreferences = DEFAULT_SLSKD_PREFERENCES
): TrackCandidate | null {
  const normalizedTitle = normalize(trackTitle);
  if (!normalizedTitle) return null;

  const candidates: TrackCandidate[] = [];
  for (const response of responses) {
    for (const file of playableFiles(response, prefs)) {
      if (!normalize(basename(file.filename ?? '')).includes(normalizedTitle)) continue;
      candidates.push({
        username: response.username,
        hasFreeUploadSlot: response.hasFreeUploadSlot === true,
        file,
      });
    }
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (prefs.preferFreeSlot && a.hasFreeUploadSlot !== b.hasFreeUploadSlot) {
      return a.hasFreeUploadSlot ? -1 : 1;
    }
    const aFlac = ext(a.file.filename) === 'flac' ? 1 : 0;
    const bFlac = ext(b.file.filename) === 'flac' ? 1 : 0;
    if (aFlac !== bFlac) return bFlac - aFlac;
    return (b.file.bitRate ?? 0) - (a.file.bitRate ?? 0);
  });

  return candidates[0];
}
