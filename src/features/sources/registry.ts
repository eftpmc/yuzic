import { useSelector } from 'react-redux'
import {
  resolveDeezerAlbum,
  resolveDeezerArtistByName,
  getDeezerAlbum,
  getDeezerArtist,
  getDeezerArtistAlbums,
  getDeezerArtistTopTracks,
  getDeezerRelatedArtists,
} from '@/api/deezer'
import {
  selectDeezerExternalEnabled,
  selectMusicbrainzExternalEnabled,
} from '@/utils/redux/selectors/settingsSelectors'
import * as mb from '@/api/musicbrainz'
import type { CoverSource, ExternalAlbum, ExternalAlbumBase, ExternalArtist } from '@/types'
import { sourceColor } from '@/constants/design'
import type { IntegrationModule, Health } from '@/features/integrations/types'

export type SourceId = 'deezer' | 'musicbrainz'

export type SourceResolvedArtist = {
  source: SourceId
  id: string
  name: string
  coverUrl?: string
}

export type SourceResolvedAlbum = {
  source: SourceId
  id: string
  title: string
  artist: string
  coverUrl?: string
}

export type SourceDefinition = IntegrationModule & {
  // Narrows `IntegrationModule.id: string` back to the closed source-id
  // union so every existing consumer keyed on `SourceId` still compiles.
  id: SourceId
  color: string
  /**
   * Kept as their own top-level fields (not read off `slots`) because every
   * existing consumer (ExternalResolutionProvider, useMatchedNavigation, the
   * Home/Search source headers) calls them directly; `slots['resolution']`
   * / `slots['discovery.shelf']` are an additional capability-view over the
   * same methods, kept in sync below, not a replacement for them.
   */
  resolveArtist(name: string): Promise<SourceResolvedArtist | null>
  resolveAlbum(artist: string, title: string): Promise<SourceResolvedAlbum | null>
  fetchAlbum(id: string): Promise<ExternalAlbum | null>
  fetchArtist(id: string, mbid?: string | null): Promise<ExternalArtist | null>
  fetchArtistAlbums(artistId: string, limit: number, artistName?: string): Promise<ExternalAlbumBase[]>
}

/**
 * Both sources are keyless public APIs — no credentials, no server URL, no
 * account. `'none'` still leaks query contents to the provider (§7 rule 1),
 * so it isn't "no auth model", just the weakest tier.
 */
const noAuth = { tier: 'none' as const }

/**
 * There is nothing to authenticate for a keyless public source — it is
 * reachable by construction. "Enabled" is a plain user setting
 * (`selectDeezerExternalEnabled` / `selectMusicbrainzExternalEnabled`), not a
 * connection, so this deliberately does not perform a network ping.
 */
const trivialTestConnection = async (): Promise<Health> => ({ ok: true })


function urlFromCover(cover: CoverSource): string | undefined {
  return cover.kind === 'url' ? cover.url : undefined
}

const deezerSource: SourceDefinition = {
  id: 'deezer',
  label: 'Deezer',
  color: sourceColor.deezer,
  auth: noAuth,
  testConnection: trivialTestConnection,
  // Deezer fills identity/metadata resolution (resolveArtist/resolveAlbum)
  // and feeds Home's external discovery shelves — hence
  // `useEnabledExternalSources` existing at all. Values are markers onto the
  // existing resolve/fetch methods (`SlotImpl` is `unknown`), not a new API.
  slots: {
    resolution: resolveDeezerArtistByName,
    'discovery.shelf': getDeezerArtistAlbums,
  },

  async resolveArtist(name) {
    const artist = await resolveDeezerArtistByName(name)
    if (!artist?.id) return null
    return { source: 'deezer', id: artist.id, name: artist.name, coverUrl: urlFromCover(artist.cover) }
  },

  async resolveAlbum(artist, title) {
    const album = await resolveDeezerAlbum(artist, title)
    if (!album) return null
    return { source: 'deezer', id: album.id, title: album.title, artist: album.artist, coverUrl: urlFromCover(album.cover) }
  },

  async fetchAlbum(id) {
    return getDeezerAlbum(id)
  },

  async fetchArtistAlbums(artistId, limit, artistName) {
    const fallback = artistName
      ? { id: artistId, name: artistName, subtext: '', cover: { kind: 'none' as const }, externalSource: 'deezer' as const, externalIds: { deezerId: artistId } }
      : null
    return getDeezerArtistAlbums(artistId, limit, fallback)
  },

  async fetchArtist(id, mbid) {
    const base = await getDeezerArtist(id)
    if (!base) return null
    const [albums, topTracks, similarArtists] = await Promise.all([
      getDeezerArtistAlbums(id, 80, base),
      getDeezerArtistTopTracks(id, 10),
      getDeezerRelatedArtists(id, 8),
    ])
    return {
      ...base,
      externalIds: { ...base.externalIds, mbid: mbid ?? base.externalIds?.mbid ?? null },
      topTracks,
      albums: albums.filter(a => a.releaseType !== 'single'),
      singles: albums.filter(a => a.releaseType === 'single'),
      similarArtists,
    }
  },
}

function releaseGroupToCover(rg: mb.MbReleaseGroup): CoverSource {
  return { kind: 'coverartarchive', mbid: rg.id, mbidType: 'release-group' }
}

function releaseGroupToAlbumBase(
  rg: mb.MbReleaseGroup,
  fallbackArtist: string,
  fallbackArtistMbid?: string
): ExternalAlbumBase {
  const artistName = rg['artist-credit']?.[0]?.artist.name ?? fallbackArtist
  const artistMbid = rg['artist-credit']?.[0]?.artist.id ?? fallbackArtistMbid ?? null
  return {
    id: rg.id,
    title: rg.title,
    artist: artistName,
    artistMbid,
    cover: releaseGroupToCover(rg),
    subtext: rg['first-release-date']?.slice(0, 4) ?? '',
    releaseDate: rg['first-release-date'] ?? undefined,
    releaseType: rg['primary-type']?.toLowerCase() === 'single' ? 'single' : 'album',
    externalSource: 'musicbrainz',
    externalIds: { mbid: rg.id, artistMbid },
  }
}

const musicbrainzSource: SourceDefinition = {
  id: 'musicbrainz',
  label: 'MusicBrainz',
  color: '#BA478F',
  auth: noAuth,
  testConnection: trivialTestConnection,
  // MusicBrainz fills identity/metadata resolution (resolveArtist/
  // resolveAlbum) and feeds Home's external discovery shelves — hence
  // `useEnabledExternalSources` existing at all. Values are markers onto the
  // existing resolve/fetch methods (`SlotImpl` is `unknown`), not a new API.
  slots: {
    resolution: mb.searchArtist,
    'discovery.shelf': mb.getArtistWithReleases,
  },

  async resolveArtist(name) {
    const results = await mb.searchArtist(name, 5)
    const best = results[0]
    if (!best) return null
    return { source: 'musicbrainz', id: best.id, name: best.name }
  },

  async resolveAlbum(artist, title) {
    const results = await mb.searchReleaseGroup(artist, title, 5)
    const best = results[0]
    if (!best) return null
    return {
      source: 'musicbrainz',
      id: best.id,
      title: best.title,
      artist,
      coverUrl: mb.coverArtArchiveUrl(best.id),
    }
  },

  async fetchAlbum(id) {
    const [rg, tracks] = await Promise.all([
      mb.getReleaseGroup(id),
      mb.getTracksForReleaseGroup(id),
    ])
    const artistName = rg['artist-credit']?.[0]?.artist.name ?? ''
    const artistMbid = rg['artist-credit']?.[0]?.artist.id ?? null
    const songs = tracks.map(track => ({
      id: track.recording?.id ?? track.id,
      title: track.title,
      artist: track['artist-credit']?.[0]?.artist.name ?? artistName,
      cover: { kind: 'none' as const },
      duration: track.length ? String(Math.round(track.length / 1000)) : '0',
      albumId: id,
      externalSource: 'musicbrainz' as const,
    }))
    return {
      id: rg.id,
      title: rg.title,
      artist: artistName,
      artistMbid,
      cover: releaseGroupToCover(rg),
      subtext: rg['first-release-date']?.slice(0, 4) ?? '',
      releaseDate: rg['first-release-date'] ?? undefined,
      releaseType: rg['primary-type']?.toLowerCase() === 'single' ? 'single' : 'album',
      externalSource: 'musicbrainz',
      externalIds: { mbid: rg.id, artistMbid },
      songs,
    }
  },

  async fetchArtistAlbums(artistId, limit) {
    const artist = await mb.getArtistWithReleases(artistId)
    const rgs = artist['release-groups'] ?? []
    return rgs
      .slice(0, limit)
      .map(rg => releaseGroupToAlbumBase(rg, artist.name, artist.id))
  },

  async fetchArtist(id) {
    const artist = await mb.getArtistWithReleases(id)
    const rgs = artist['release-groups'] ?? []
    const albums = rgs
      .filter(rg => !rg['primary-type'] || rg['primary-type'] === 'Album')
      .map(rg => releaseGroupToAlbumBase(rg, artist.name, artist.id))
    const singles = rgs
      .filter(rg => rg['primary-type'] === 'Single' || rg['primary-type'] === 'EP')
      .map(rg => releaseGroupToAlbumBase(rg, artist.name, artist.id))
    return {
      id: artist.id,
      name: artist.name,
      cover: { kind: 'none' },
      subtext: '',
      biography: artist.annotation ?? undefined,
      externalSource: 'musicbrainz',
      externalIds: { mbid: artist.id },
      topTracks: [],
      albums,
      singles,
      similarArtists: [],
    }
  },
}

export const ALL_SOURCES: SourceDefinition[] = [deezerSource, musicbrainzSource]

export function getSourceMeta(id: string): Pick<SourceDefinition, 'label' | 'color'> | null {
  return ALL_SOURCES.find(s => s.id === id) ?? null
}

export function useEnabledExternalSources(): SourceDefinition[] {
  const deezerEnabled = useSelector(selectDeezerExternalEnabled)
  const musicbrainzEnabled = useSelector(selectMusicbrainzExternalEnabled)
  return ALL_SOURCES.filter(s => {
    if (s.id === 'deezer') return deezerEnabled
    if (s.id === 'musicbrainz') return musicbrainzEnabled
    return false
  })
}
