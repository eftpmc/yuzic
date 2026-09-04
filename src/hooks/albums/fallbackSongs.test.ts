import { buildFallbackAlbumSongs } from './fallbackSongs'
import type { SongBase } from '@/types'

const track = (id: string, albumId: string, overrides: Partial<SongBase> = {}): SongBase => ({
  id,
  title: `Track ${id}`,
  artist: 'Artist',
  artistId: 'artist-1',
  cover: { kind: 'none' },
  duration: '200',
  albumId,
  ...overrides,
})

describe('buildFallbackAlbumSongs', () => {
  it('returns only the tracks belonging to the album', () => {
    const tracks = [
      track('a', 'album-1'),
      track('b', 'album-2'),
      track('c', 'album-1'),
    ]

    expect(buildFallbackAlbumSongs(tracks, 'album-1').map(s => s.id)).toEqual(['a', 'c'])
  })

  it('orders by disc then track number', () => {
    const tracks = [
      track('d2t1', 'album-1', { disc: 2, trackNumber: 1 }),
      track('d1t2', 'album-1', { disc: 1, trackNumber: 2 }),
      track('d1t1', 'album-1', { disc: 1, trackNumber: 1 }),
    ]

    expect(buildFallbackAlbumSongs(tracks, 'album-1').map(s => s.id))
      .toEqual(['d1t1', 'd1t2', 'd2t1'])
  })

  it('sinks tracks without a track number and treats missing disc as disc 1', () => {
    const tracks = [
      track('unnumbered', 'album-1'),
      track('t1', 'album-1', { trackNumber: 1 }),
    ]

    expect(buildFallbackAlbumSongs(tracks, 'album-1').map(s => s.id))
      .toEqual(['t1', 'unnumbered'])
  })

  it('produces playable-shaped songs with an empty streamUrl for lazy resolution', () => {
    const result = buildFallbackAlbumSongs([track('a', 'album-1')], 'album-1')
    expect(result[0].streamUrl).toBe('')
  })

  it('returns empty for a missing album id', () => {
    expect(buildFallbackAlbumSongs([track('a', 'album-1')], '')).toEqual([])
  })
})
