import type { ExternalAlbumBase } from '@/types'

export type LastFmAlbum = {
  name: string
  mbid: string | null
  mbidType?: 'release' | 'release-group' | null
  releaseMbid?: string | null
  releaseGroupMbid?: string | null
  artist: string
  artistMbid: string | null
  image: string | null
}

export async function getLastFmArtistAlbums(
  rawarrUrl: string,
  artistName: string,
  limit = 5
): Promise<LastFmAlbum[]> {
  try {
    const params = new URLSearchParams({ artist: artistName, limit: String(limit) })
    const res = await fetch(`${rawarrUrl}/api/lastfm/artist-albums?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.albums) ? data.albums : []
  } catch {
    return []
  }
}

export function lastFmAlbumToExternal(album: LastFmAlbum & { mbid: string }): ExternalAlbumBase {
  return {
    id: album.mbid,
    title: album.name,
    artist: album.artist,
    artistMbid: album.artistMbid,
    subtext: album.artist,
    releaseType: 'album',
    cover: album.image ? { kind: 'url', url: album.image } : { kind: 'none' },
  }
}
