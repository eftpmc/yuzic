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

export type SourceDefinition = {
  id: SourceId
  label: string
  color: string
  resolveArtist(name: string): Promise<SourceResolvedArtist | null>
  resolveAlbum(artist: string, title: string): Promise<SourceResolvedAlbum | null>
  fetchAlbum(id: string): Promise<ExternalAlbum | null>
  fetchArtist(id: string, mbid?: string | null): Promise<ExternalArtist | null>
  fetchArtistAlbums(artistId: string, limit: number, artistName?: string): Promise<ExternalAlbumBase[]>
}

function urlFromCover(cover: CoverSource): string | undefined {
  return cover.kind === 'url' ? cover.url : undefined
}

const deezerSource: SourceDefinition = {
  id: 'deezer',
  label: 'Deezer',
  color: '#A238CA',

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

function releaseGroupToAlbumBase(rg: mb.MbReleaseGroup, fallbackArtist: string): ExternalAlbumBase {
  const artistName = rg['artist-credit']?.[0]?.artist.name ?? fallbackArtist
  return {
    id: rg.id,
    title: rg.title,
    artist: artistName,
    cover: releaseGroupToCover(rg),
    subtext: rg['first-release-date']?.slice(0, 4) ?? '',
    releaseType: rg['primary-type']?.toLowerCase() === 'single' ? 'single' : 'album',
    externalSource: 'musicbrainz',
    externalIds: { mbid: rg.id },
  }
}

const musicbrainzSource: SourceDefinition = {
  id: 'musicbrainz',
  label: 'MusicBrainz',
  color: '#BA478F',

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
      cover: releaseGroupToCover(rg),
      subtext: rg['first-release-date']?.slice(0, 4) ?? '',
      externalSource: 'musicbrainz',
      externalIds: { mbid: rg.id },
      songs,
    }
  },

  async fetchArtistAlbums(artistId, limit) {
    const artist = await mb.getArtistWithReleases(artistId)
    const rgs = artist['release-groups'] ?? []
    return rgs
      .slice(0, limit)
      .map(rg => releaseGroupToAlbumBase(rg, artist.name))
  },

  async fetchArtist(id) {
    const artist = await mb.getArtistWithReleases(id)
    const rgs = artist['release-groups'] ?? []
    const albums = rgs
      .filter(rg => !rg['primary-type'] || rg['primary-type'] === 'Album')
      .map(rg => releaseGroupToAlbumBase(rg, artist.name))
    const singles = rgs
      .filter(rg => rg['primary-type'] === 'Single' || rg['primary-type'] === 'EP')
      .map(rg => releaseGroupToAlbumBase(rg, artist.name))
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
