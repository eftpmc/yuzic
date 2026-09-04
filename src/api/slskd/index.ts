export { testConnection } from './auth';
export {
  fetchQueue,
  fetchQueueWithDiff,
  detectFinishedQueueItems,
  cancelQueueItem,
} from './queue';
export type { SlskdQueueRecord } from './queue';
export { downloadAlbum, downloadTrack } from './downloads';
export type {
  DownloadAlbumResult,
  DownloadTrackResult,
  SlskdDownloadErrorCode,
} from './downloads';
export type { SlskdConfig, SlskdSearchPreferences } from './client';
export { DEFAULT_SLSKD_PREFERENCES } from './client';
