import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import type { Href } from 'expo-router'
import * as lidarr from '@/api/lidarr'
import * as slskd from '@/api/slskd'
import * as soulsync from '@/api/soulsync'
import type { SlskdSearchPreferences } from '@/api/slskd'
import type { DownloaderId } from '@/utils/redux/slices/downloadersSlice'
import type { ExternalAlbumBase, LidarrConfig } from '@/types'
import { selectDownloadersForActiveServer } from '@/utils/redux/selectors/downloadersSelectors'
import type { IntegrationModule, Health } from '@/features/integrations/types'

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

/**
 * Downloaders converge on the `IntegrationModule` contract (auth, slots,
 * testConnection) while keeping their own operational fields — settings
 * route, toast keys, and queue polling — that aren't product capabilities
 * and so have no `CapabilitySlot` of their own.
 */
export type DownloaderDefinition = IntegrationModule & {
  // Narrows `IntegrationModule.id: string` back to the closed downloader-id
  // union so every existing consumer keyed on `DownloaderId` still compiles.
  id: DownloaderId
  descriptionKey: string
  albumAddedKey: string
  trackAddedKey?: string
  settingsRoute: Href
  /**
   * Both units are optional, because a downloader gets to have a natural one.
   * Lidarr is album-oriented and can't fetch a single file; SoulSync's request
   * pipeline is track-oriented and has no album endpoint at all; slskd does
   * both. Callers presence-check the unit they need rather than assuming an
   * album is always on offer — `downloadAlbum` used to be required, which was
   * Lidarr's shape written into the contract for everyone.
   *
   * These stay as their own top-level fields (not read off `slots`) because
   * every existing consumer calls them directly; `slots['acquisition.album']`
   * / `slots['acquisition.track']` are an additional capability-view over the
   * same methods, kept in sync below, not a replacement for them.
   */
  downloadAlbum?(config: DownloaderConfig, req: AlbumDownloadRequest): Promise<DownloadResult>
  downloadTrack?(config: DownloaderConfig, req: TrackDownloadRequest): Promise<DownloadResult>
  /**
   * Reads the transfer queue and reports which items disappeared since the
   * previous read — the global completion watcher uses these disappearances to
   * kick a server rescan so downloaded music appears without a manual pull.
   * Typed loosely because each downloader has its own record shape and the
   * watcher only needs the count of finished items.
   *
   * Downloader-operational, not a product capability: it's how a downloader
   * reports progress on units it already fills, not a unit of its own — so it
   * deliberately does not map to a `CapabilitySlot`.
   */
  fetchQueueWithDiff<T extends { id: string }>(
    config: DownloaderConfig,
    previous: T[]
  ): Promise<{ currentQueue: T[]; finishedItems: T[] }>
}

/** All three downloaders authenticate the same way: a server URL plus an API key. */
const apiKeyAuth = { tier: 'apiKey' as const, configKeys: ['serverUrl', 'apiKey'] }

function lidarrConfigOf(config: DownloaderConfig): LidarrConfig {
  return { serverUrl: config.serverUrl, apiKey: config.apiKey }
}

const lidarrDownloadAlbum = (config: DownloaderConfig, album: AlbumDownloadRequest) =>
  lidarr.downloadAlbum(config, lidarr.albumRequestFromExternal(album))

const lidarrDownloader: DownloaderDefinition = {
  id: 'lidarr',
  label: 'Lidarr',
  descriptionKey: 'externalAlbum.download.lidarrDesc',
  albumAddedKey: 'externalAlbum.download.addedToLidarr',
  settingsRoute: '/settings/lidarrView',
  auth: apiKeyAuth,
  // Lidarr is album-only — no `acquisition.track` slot.
  slots: {
    'acquisition.album': lidarrDownloadAlbum,
  },
  downloadAlbum: lidarrDownloadAlbum,
  fetchQueueWithDiff: lidarr.fetchQueueWithDiff as DownloaderDefinition['fetchQueueWithDiff'],
  testConnection: async (config: unknown): Promise<Health> => {
    const ok = await lidarr.testConnection(lidarrConfigOf(config as DownloaderConfig))
    return { ok: Boolean(ok) }
  },
}

function soulsyncConfigOf(config: DownloaderConfig): soulsync.SoulSyncConfig {
  return { serverUrl: config.serverUrl, apiKey: config.apiKey }
}

function slskdConfigOf(config: DownloaderConfig): slskd.SlskdConfig {
  return {
    serverUrl: config.serverUrl,
    apiKey: config.apiKey,
    preferences: config.preferences as SlskdSearchPreferences | undefined,
  }
}

const slskdDownloadAlbum = (config: DownloaderConfig, album: AlbumDownloadRequest) =>
  slskd.downloadAlbum(slskdConfigOf(config), {
    title: album.title,
    artist: album.artist,
    // Preserve any MBID the resolver captured — the slskd side uses it to
    // pull canonical strings from MusicBrainz before searching Soulseek.
    mbid: album.externalIds?.mbid ?? null,
  })

const slskdDownloadTrack = (config: DownloaderConfig, req: TrackDownloadRequest) =>
  slskd.downloadTrack(slskdConfigOf(config), {
    title: req.title,
    artist: req.artist,
  })

const slskdDownloader: DownloaderDefinition = {
  id: 'slskd',
  label: 'Soulseek',
  descriptionKey: 'externalAlbum.download.slskdDesc',
  albumAddedKey: 'externalAlbum.download.addedToSlskd',
  trackAddedKey: 'externalAlbum.download.addedTrackToSlskd',
  settingsRoute: '/settings/slskdView',
  auth: apiKeyAuth,
  // slskd does both units.
  slots: {
    'acquisition.album': slskdDownloadAlbum,
    'acquisition.track': slskdDownloadTrack,
  },
  downloadAlbum: slskdDownloadAlbum,
  downloadTrack: slskdDownloadTrack,
  fetchQueueWithDiff: ((config: DownloaderConfig, previous: { id: string }[]) =>
    slskd.fetchQueueWithDiff(slskdConfigOf(config), previous as any)) as DownloaderDefinition['fetchQueueWithDiff'],
  testConnection: async (config: unknown): Promise<Health> => {
    const ok = await slskd.testConnection(slskdConfigOf(config as DownloaderConfig))
    return { ok }
  },
}

/**
 * SoulSync takes a track and nothing else. Its public entry point is a single
 * free-text request that runs its own search-match-download pipeline, and it
 * exposes no album endpoint — so this is the first downloader with no
 * `downloadAlbum`, and the reason that field became optional.
 */
const soulsyncDownloadTrack = async (config: DownloaderConfig, req: TrackDownloadRequest): Promise<DownloadResult> => {
  try {
    await soulsync.downloadTrack(soulsyncConfigOf(config), req)
    return { success: true }
  } catch (error) {
    const code = error instanceof soulsync.SoulSyncError ? error.code : undefined
    return { success: false, code, message: (error as Error)?.message ?? 'SoulSync request failed' }
  }
}

const soulsyncDownloader: DownloaderDefinition = {
  id: 'soulsync',
  label: 'SoulSync',
  descriptionKey: 'externalAlbum.download.soulsyncDesc',
  albumAddedKey: 'externalAlbum.download.addedToSoulsync',
  trackAddedKey: 'externalAlbum.download.addedTrackToSoulsync',
  settingsRoute: '/settings/soulsyncView',
  auth: apiKeyAuth,
  // SoulSync is track-only — no `acquisition.album` slot.
  slots: {
    'acquisition.track': soulsyncDownloadTrack,
  },
  downloadTrack: soulsyncDownloadTrack,
  fetchQueueWithDiff: ((config: DownloaderConfig, previous: { id: string }[]) =>
    soulsync.fetchQueueWithDiff(soulsyncConfigOf(config), previous as any)) as DownloaderDefinition['fetchQueueWithDiff'],
  testConnection: async (config: unknown): Promise<Health> => {
    const ok = await soulsync.testConnection(soulsyncConfigOf(config as DownloaderConfig))
    return { ok }
  },
}

export const ALL_DOWNLOADERS: DownloaderDefinition[] = [
  lidarrDownloader,
  slskdDownloader,
  soulsyncDownloader,
]

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

/** Somewhere to send a whole album — not every connected downloader takes one. */
export function useAnyAlbumDownloaderConnected(): boolean {
  return useDownloaderStates().some((d) => d.isConnected && !!d.def.downloadAlbum)
}
