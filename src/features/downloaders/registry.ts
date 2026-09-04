import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import type { Href } from 'expo-router'
import * as lidarr from '@/api/lidarr'
import * as slskd from '@/api/slskd'
import type { SlskdSearchPreferences } from '@/api/slskd'
import type { DownloaderId } from '@/utils/redux/slices/downloadersSlice'
import type { ExternalAlbumBase } from '@/types'
import { selectDownloadersForActiveServer } from '@/utils/redux/selectors/downloadersSelectors'

export { downloadErrorKey } from './errorKeys'

export type { DownloaderId }

/**
 * Common shape every downloader accepts. `preferences` is optional and
 * downloader-specific — slskd reads its own search settings from it, other
 * downloaders ignore it. Kept untyped at this layer so a new downloader with
 * its own preferences shape doesn't have to widen this file.
 */
export type DownloaderConfig = {
  serverUrl: string
  apiKey: string
  preferences?: Record<string, unknown>
}

export type DownloadResult =
  | { success: true }
  | { success: false; code?: string; message: string }

/**
 * The whole external album, not just its title and artist: Lidarr resolves the
 * release by MBID/Deezer id where available, and collapsing it to two strings
 * here would put it back on fuzzy name matching.
 */
export type AlbumDownloadRequest = ExternalAlbumBase
export type TrackDownloadRequest = { title: string; artist: string }

export type DownloaderDefinition = {
  id: DownloaderId
  /** Display name shown to users (not translated — product names). */
  label: string
  descriptionKey: string
  albumAddedKey: string
  trackAddedKey?: string
  settingsRoute: Href
  downloadAlbum(config: DownloaderConfig, req: AlbumDownloadRequest): Promise<DownloadResult>
  /** Only downloaders that can fetch individual files support this (Lidarr is album-oriented). */
  downloadTrack?(config: DownloaderConfig, req: TrackDownloadRequest): Promise<DownloadResult>
  /**
   * Reads the transfer queue and reports which items disappeared since the
   * previous read — the global completion watcher uses these disappearances to
   * kick a server rescan so downloaded music appears without a manual pull.
   * Typed loosely because each downloader has its own record shape and the
   * watcher only needs the count of finished items.
   */
  fetchQueueWithDiff<T extends { id: string }>(
    config: DownloaderConfig,
    previous: T[]
  ): Promise<{ currentQueue: T[]; finishedItems: T[] }>
}

const lidarrDownloader: DownloaderDefinition = {
  id: 'lidarr',
  label: 'Lidarr',
  descriptionKey: 'externalAlbum.download.lidarrDesc',
  albumAddedKey: 'externalAlbum.download.addedToLidarr',
  settingsRoute: '/settings/lidarrView',
  downloadAlbum: (config, album) => lidarr.downloadAlbum(config, lidarr.albumRequestFromExternal(album)),
  fetchQueueWithDiff: lidarr.fetchQueueWithDiff as DownloaderDefinition['fetchQueueWithDiff'],
}

function slskdConfigOf(config: DownloaderConfig): slskd.SlskdConfig {
  return {
    serverUrl: config.serverUrl,
    apiKey: config.apiKey,
    preferences: config.preferences as SlskdSearchPreferences | undefined,
  }
}

const slskdDownloader: DownloaderDefinition = {
  id: 'slskd',
  label: 'Soulseek',
  descriptionKey: 'externalAlbum.download.slskdDesc',
  albumAddedKey: 'externalAlbum.download.addedToSlskd',
  trackAddedKey: 'externalAlbum.download.addedTrackToSlskd',
  settingsRoute: '/settings/slskdView',
  downloadAlbum: (config, album) => slskd.downloadAlbum(slskdConfigOf(config), {
    title: album.title,
    artist: album.artist,
    // Preserve any MBID the resolver captured — the slskd side uses it to
    // pull canonical strings from MusicBrainz before searching Soulseek.
    mbid: album.externalIds?.mbid ?? null,
  }),
  downloadTrack: (config, req) => slskd.downloadTrack(slskdConfigOf(config), {
    title: req.title,
    artist: req.artist,
  }),
  fetchQueueWithDiff: ((config: DownloaderConfig, previous: { id: string }[]) =>
    slskd.fetchQueueWithDiff(slskdConfigOf(config), previous as any)) as DownloaderDefinition['fetchQueueWithDiff'],
}

export const ALL_DOWNLOADERS: DownloaderDefinition[] = [lidarrDownloader, slskdDownloader]

export type DownloaderState = {
  def: DownloaderDefinition
  config: DownloaderConfig
  isConnected: boolean
}

export function useDownloaderStates(): DownloaderState[] {
  const entry = useSelector(selectDownloadersForActiveServer)
  // Memoized on `entry`: callers use the returned array as an effect
  // dependency, and a fresh array every render turns those effects into
  // render loops.
  return useMemo(() => ALL_DOWNLOADERS.map((def) => {
    const connection = entry[def.id]
    return {
      def,
      config: {
        serverUrl: connection?.serverUrl ?? '',
        apiKey: connection?.apiKey ?? '',
        // Bundling preferences into the config here means every download-time
        // call site — the sheet, the auto-downloader, batch flows — carries
        // them without having to know they exist.
        preferences: connection?.preferences,
      },
      isConnected: connection?.isAuthenticated === true,
    }
  }), [entry])
}

export function useAnyDownloaderConnected(): boolean {
  return useDownloaderStates().some((d) => d.isConnected)
}

export function useAnyTrackDownloaderConnected(): boolean {
  return useDownloaderStates().some((d) => d.isConnected && !!d.def.downloadTrack)
}
