export { testConnection } from './auth';
export {
  fetchQueue,
  fetchQueueWithDiff,
  detectFinishedQueueItems,
} from './queue';
export type { SlskdQueueRecord } from './queue';
export { downloadAlbum, downloadTrack } from './downloads';
export type {
  DownloadAlbumResult,
  DownloadTrackResult,
  SlskdDownloadErrorCode,
} from './downloads';
export type { SlskdConfig } from './client';
