import { createLidarrClient } from './client';
import type { LidarrConfig } from '@/types';
import * as artists from './artists';

// Auth / connection
export { testConnection } from './auth';

// Artists
export function lookupArtist(config: LidarrConfig, term: string) {
  return artists.lookupArtist(createLidarrClient(config), term);
}
export function getArtists(config: LidarrConfig) {
  return artists.getArtists(createLidarrClient(config));
}
export function ensureArtist(
  config: LidarrConfig,
  artist: Parameters<typeof artists.ensureArtist>[1],
  opts?: Parameters<typeof artists.ensureArtist>[2]
) {
  return artists.ensureArtist(createLidarrClient(config), artist, opts);
}

// Albums
export {
  albumRequestFromExternal,
  downloadAlbum,
} from './albums';
export type {
  AlbumSearchResult,
  LidarrAlbumRequest,
} from './albums';

// Queue
export {
  fetchQueue,
  fetchQueueWithDiff,
  detectFinishedQueueItems,
} from './queue';
export type { LidarrQueueRecord } from './queue';
