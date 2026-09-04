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
}

const lidarrDownloader: DownloaderDefinition = {
  id: 'lidarr',
  label: 'Lidarr',
  descriptionKey: 'externalAlbum.download.lidarrDesc',
  albumAddedKey: 'externalAlbum.download.addedToLidarr',
  settingsRoute: '/settings/lidarrView',
  downloadAlbum: (config, album) => lidarr.downloadAlbum(config, lidarr.albumRequestFromExternal(album)),
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
  downloadAlbum: (config, album) => slskd.downloadAlbum(slskdConfigOf(config), album.title, album.artist),
  downloadTrack: (config, req) => slskd.downloadTrack(slskdConfigOf(config), req.title, req.artist),
}

export const ALL_DOWNLOADERS: DownloaderDefinition[] = [lidarrDownloader, slskdDownloader]

export type DownloaderState = {
  def: DownloaderDefinition
  config: DownloaderConfig
  isConnected: boolean
}

export function useDownloaderStates(): DownloaderState[] {
  const entry = useSelector(selectDownloadersForActiveServer)
  return ALL_DOWNLOADERS.map((def) => {
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
  })
}

export function useAnyDownloaderConnected(): boolean {
  return useDownloaderStates().some((d) => d.isConnected)
}

export function useAnyTrackDownloaderConnected(): boolean {
  return useDownloaderStates().some((d) => d.isConnected && !!d.def.downloadTrack)
}
