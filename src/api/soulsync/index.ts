export {
  testConnection,
  downloadTrack,
  fetchQueue,
  fetchQueueWithDiff,
  detectFinishedQueueItems,
  cancelDownload,
  buildQuery,
} from './downloads';
export type { SoulSyncQueueRecord, TrackRequest } from './downloads';
export { createSoulSyncClient, SoulSyncError } from './client';
export type { SoulSyncConfig } from './client';
