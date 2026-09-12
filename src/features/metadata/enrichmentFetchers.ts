/**
 * Real (network-backed) fetchers for every metadata.enrich source. Kept
 * separate from `resolveArtistInfo`/`resolveArtwork` so tests inject fakes
 * instead of this module — same split as `features/lyrics`.
 *
 * Each fetcher is wrapped in a small bounded in-memory cache: enrichment
 * lookups are keyed by artist name (lowercased) and never expire mid-session,
 * capped at a low entry count evicted oldest-first, mirroring the shape of
 * `api/deezer`'s own request cache without pulling in that module's TTL
 * machinery (these results are much more stable than chart/album data).
 */
import { getLastFmArtistInfo } from '@/api/lastfm';
import { getDeezerArtist } from '@/api/deezer';
import { coverArtArchiveUrl } from '@/api/musicbrainz';
import { LASTFM_API_KEY } from '@/constants/keys';
import type { ArtistInfoFetchers, ArtistInfoResult } from './resolveArtistInfo';
import type { ArtworkFetchers, ArtworkResult } from './resolveArtwork';

const MAX_CACHE_ENTRIES = 200;

function boundedCache<T>() {
  const map = new Map<string, T>();
  return {
    get(key: string): T | undefined {
      return map.get(key);
    },
    set(key: string, value: T): void {
      if (map.size >= MAX_CACHE_ENTRIES && !map.has(key)) {
        const oldestKey = map.keys().next().value;
        if (oldestKey !== undefined) map.delete(oldestKey);
      }
      map.set(key, value);
    },
  };
}

const artistInfoCache = boundedCache<ArtistInfoResult | null>();
const artworkCache = boundedCache<ArtworkResult | null>();

export const metadataArtistInfoFetchers: ArtistInfoFetchers = {
  lastfm: async artist => {
    const key = `lastfm:${artist.name.trim().toLowerCase()}`;
    const cached = artistInfoCache.get(key);
    if (cached !== undefined) return cached;

    if (!LASTFM_API_KEY || !artist.name.trim()) {
      artistInfoCache.set(key, null);
      return null;
    }

    const info = await getLastFmArtistInfo(LASTFM_API_KEY, artist.name);
    const result: ArtistInfoResult | null = info
      ? { bio: info.bio, tags: info.tags, source: 'lastfm' }
      : null;
    artistInfoCache.set(key, result);
    return result;
  },
};

export const metadataArtworkFetchers: ArtworkFetchers = {
  deezer: async entity => {
    const key = `deezer:${entity.name.trim().toLowerCase()}`;
    const cached = artworkCache.get(key);
    if (cached !== undefined) return cached;

    if (!entity.name.trim()) {
      artworkCache.set(key, null);
      return null;
    }

    // Deezer artist images are looked up by id, not name — resolve via the
    // existing name search before fetching the artist record.
    const { resolveDeezerArtistByName } = await import('@/api/deezer/catalog');
    const resolved = await resolveDeezerArtistByName(entity.name);
    if (!resolved) {
      artworkCache.set(key, null);
      return null;
    }
    const full = await getDeezerArtist(resolved.id);
    const result: ArtworkResult | null =
      full && full.cover.kind !== 'none' ? { cover: full.cover, source: 'deezer' } : null;
    artworkCache.set(key, result);
    return result;
  },

  coverartarchive: async entity => {
    if (!entity.mbid) return null;
    const key = `coverartarchive:${entity.mbid}`;
    const cached = artworkCache.get(key);
    if (cached !== undefined) return cached;

    // Cover Art Archive has no "does this exist" endpoint cheaper than a
    // HEAD request against the front image; a cache hit here means we don't
    // repeat that request for the same release/release-group.
    const url = coverArtArchiveUrl(entity.mbid);
    let exists = false;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      exists = res.ok;
    } catch {
      exists = false;
    }

    const result: ArtworkResult | null = exists
      ? {
          cover: { kind: 'coverartarchive', mbid: entity.mbid, mbidType: entity.mbidType ?? 'release-group' },
          source: 'coverartarchive',
        }
      : null;
    artworkCache.set(key, result);
    return result;
  },
};
