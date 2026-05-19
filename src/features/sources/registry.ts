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
import { selectDeezerExternalScreensEnabled } from '@/utils/redux/selectors/settingsSelectors'
import type { CoverSource, ExternalAlbum, ExternalAlbumBase, ExternalArtist } from '@/types'

export type SourceId = 'deezer'

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

export const ALL_SOURCES: SourceDefinition[] = [deezerSource]

export function getSourceMeta(id: string): Pick<SourceDefinition, 'label' | 'color'> | null {
  return ALL_SOURCES.find(s => s.id === id) ?? null
}

export function useEnabledExternalSources(): SourceDefinition[] {
  const deezerEnabled = useSelector(selectDeezerExternalScreensEnabled)
  return ALL_SOURCES.filter(s => {
    if (s.id === 'deezer') return deezerEnabled
    return false
  })
}
