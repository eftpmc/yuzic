import type { DownloaderId } from '@/utils/redux/slices/downloadersSlice'

/**
 * Translation key for a downloader's failure reason. Both downloaders report a
 * stable `code`; their `message` is untranslated English meant for logs, so
 * showing it directly left non-English users reading raw API text.
 *
 * Kept free of React/store imports so it stays unit-testable on its own.
 */
export function downloadErrorKey(id: DownloaderId, code?: string): string {
  return code
    ? `externalAlbum.download.errors.${id}.${code}`
    : 'externalAlbum.download.failed'
}
