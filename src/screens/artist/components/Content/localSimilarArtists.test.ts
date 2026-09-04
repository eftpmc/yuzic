import { findArtistsWithSharedGenres } from './localSimilarArtists'
import type { AlbumBase } from '@/types'

const artistRef = (id: string, name: string) => ({
  id,
  name,
  cover: { kind: 'none' as const },
  subtext: '',
})

const album = (id: string, artistId: string, artistName: string, genres: string[]): AlbumBase => ({
  id,
  title: `Album ${id}`,
  cover: { kind: 'none' },
  subtext: '',
  artist: artistRef(artistId, artistName),
  year: 2000,
  genres,
  created: new Date(0),
})

describe('findArtistsWithSharedGenres', () => {
  it('ranks other artists by number of overlapping genres', () => {
    const albums = [
      album('1', 'target', 'Target Artist', ['rock', 'indie']),
      album('2', 'a', 'Artist A', ['rock', 'indie']),
      album('3', 'b', 'Artist B', ['rock']),
      album('4', 'c', 'Artist C', ['jazz']),
    ]

    const result = findArtistsWithSharedGenres('target', albums)
    expect(result.map(a => a.id)).toEqual(['a', 'b'])
  })

  it('excludes the target artist itself', () => {
    const albums = [
      album('1', 'target', 'Target Artist', ['rock']),
      album('2', 'target', 'Target Artist', ['rock']),
    ]

    expect(findArtistsWithSharedGenres('target', albums)).toEqual([])
  })

  it('returns nothing when the target artist has no genre data', () => {
    const albums = [
      album('1', 'target', 'Target Artist', []),
      album('2', 'a', 'Artist A', ['rock']),
    ]

    expect(findArtistsWithSharedGenres('target', albums)).toEqual([])
  })

  it('respects the limit', () => {
    const albums = [
      album('t', 'target', 'Target Artist', ['rock']),
      ...Array.from({ length: 10 }, (_, i) => album(`${i}`, `artist-${i}`, `Artist ${i}`, ['rock'])),
    ]

    expect(findArtistsWithSharedGenres('target', albums, 3)).toHaveLength(3)
  })
})
