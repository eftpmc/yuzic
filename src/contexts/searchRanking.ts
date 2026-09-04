import type { CoverSource } from '@/types/Cover';
import type { Song } from '@/types';

/**
 * Ordering and de-duplication of search results.
 *
 * Split out of SearchContext because this decides what a user actually sees on
 * the most-used screen in the app: results arrive from three places at once
 * (the on-device index, the server, Deezer) and the same record often comes
 * back from more than one.
 */

export interface SearchResult {
  id: string;
  title: string;
  subtext: string;
  cover: CoverSource;
  type: 'song' | 'album' | 'artist' | 'playlist';
  source: 'local' | 'external';
  externalSource?: 'deezer' | 'musicbrainz' | 'lastfm';
  externalIds?: {
    deezerId?: string;
    artistDeezerId?: string;
    mbid?: string | null;
    artistMbid?: string | null;
    upc?: string | null;
    isrc?: string | null;
  };
  isDownloaded: boolean;
  song?: Song;
}

/** Identity of a result: the same id from the library and from Deezer are
 * different results, and a song and an album may share an id. */
export const resultKey = (result: SearchResult) =>
  `${result.source}:${result.type}:${result.id}`;

const sourceRank = (source: SearchResult['source']) => (source === 'local' ? 1 : 2);

const typeRank = (type: SearchResult['type']) =>
  type === 'song' ? 1 : type === 'album' ? 2 : type === 'artist' ? 3 : 4;

/**
 * Collapses duplicates, keeping the downloaded copy when one exists — an
 * offline-playable result is strictly more useful than the same record without
 * a local file.
 */
export function dedupeResults(results: SearchResult[]): SearchResult[] {
  const byKey = new Map<string, SearchResult>();
  for (const result of results) {
    const key = resultKey(result);
    const existing = byKey.get(key);
    if (!existing || (!existing.isDownloaded && result.isDownloaded)) {
      byKey.set(key, result);
    }
  }
  return [...byKey.values()];
}

/**
 * Ranks results by, in order: what the user owns (library before Deezer, then
 * downloaded before streamed), how well the title answers what they typed
 * (exact, then containing), and only then a stable type and alphabetical
 * ordering so equal results don't shuffle between keystrokes.
 */
export function compareResults(
  a: SearchResult,
  b: SearchResult,
  lowerQuery: string
): number {
  const sourceDiff = sourceRank(a.source) - sourceRank(b.source);
  if (sourceDiff !== 0) return sourceDiff;

  if (a.isDownloaded !== b.isDownloaded) return a.isDownloaded ? -1 : 1;

  const aTitle = a.title.toLowerCase();
  const bTitle = b.title.toLowerCase();

  const aExact = aTitle === lowerQuery;
  const bExact = bTitle === lowerQuery;
  if (aExact !== bExact) return aExact ? -1 : 1;

  const aContains = aTitle.includes(lowerQuery);
  const bContains = bTitle.includes(lowerQuery);
  if (aContains !== bContains) return aContains ? -1 : 1;

  const typeDiff = typeRank(a.type) - typeRank(b.type);
  if (typeDiff !== 0) return typeDiff;

  return aTitle.localeCompare(bTitle);
}

export function dedupeAndSort(
  results: SearchResult[],
  lowerQuery: string
): SearchResult[] {
  return dedupeResults(results).sort((a, b) => compareResults(a, b, lowerQuery));
}
