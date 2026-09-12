import type { ApiAdapter } from '@/api/types'
import { serverAdapterSlots } from '../capabilityRegistry'

/**
 * Minimal but real-shaped `ApiAdapter` fakes. Only the fields
 * `serverAdapterSlots` presence-checks are meaningfully populated; the rest
 * are the smallest stand-ins that satisfy the type so this stays a real
 * `ApiAdapter`, not `any`.
 */
function baseAdapter(): ApiAdapter {
  const empty = async () => {
    throw new Error('not implemented in fake adapter')
  }
  return {
    auth: { connect: empty, ping: empty, testUrl: empty, startScan: empty, disconnect: empty },
    albums: { list: async () => [], get: empty },
    artists: { list: async () => [], get: empty },
    genres: { list: empty },
    playlists: {
      list: async () => [],
      get: empty,
      create: empty,
      rename: empty,
      addSong: empty,
      removeSong: empty,
      delete: empty,
    },
    starred: { list: empty, add: empty, remove: empty },
    songs: {
      get: async () => null,
      scrobble: async () => {},
      buildStreamUrl: () => '',
      scrobbleKind: 'scrobble',
      streamableCodecs: ['mp3'],
    },
    tracks: { list: async () => [], get: async () => null },
    similar: {
      getSimilarSongs: async () => [],
    },
    lyrics: { getBySongId: empty },
    search: { search: async () => ({ albums: [], artists: [], songs: [] }) },
  }
}

describe('serverAdapterSlots', () => {
  it('reports the always-present slots for a minimal adapter', () => {
    const adapter = baseAdapter()
    expect(serverAdapterSlots(adapter).sort()).toEqual(['lyrics', 'scrobble', 'similarity.songs'].sort())
  })

  it('does not report similarity.artists or discovery.shelf when absent', () => {
    const adapter = baseAdapter()
    const slots = serverAdapterSlots(adapter)
    expect(slots).not.toContain('similarity.artists')
    expect(slots).not.toContain('discovery.shelf')
  })

  it('reports similarity.artists when getSimilarArtists is present', () => {
    const adapter = baseAdapter()
    adapter.similar.getSimilarArtists = async () => []
    expect(serverAdapterSlots(adapter).sort()).toEqual(
      ['lyrics', 'scrobble', 'similarity.songs', 'similarity.artists'].sort()
    )
  })

  it('reports discovery.shelf when discovery is present', () => {
    const adapter = baseAdapter()
    adapter.discovery = {
      getRandomSongs: async () => [],
      getNowPlaying: async () => [],
    }
    expect(serverAdapterSlots(adapter).sort()).toEqual(
      ['lyrics', 'scrobble', 'similarity.songs', 'discovery.shelf'].sort()
    )
  })

  it('reports both optional slots together when both are present', () => {
    const adapter = baseAdapter()
    adapter.similar.getSimilarArtists = async () => []
    adapter.discovery = {
      getRandomSongs: async () => [],
      getNowPlaying: async () => [],
    }
    expect(serverAdapterSlots(adapter).sort()).toEqual(
      ['lyrics', 'scrobble', 'similarity.songs', 'similarity.artists', 'discovery.shelf'].sort()
    )
  })
})
