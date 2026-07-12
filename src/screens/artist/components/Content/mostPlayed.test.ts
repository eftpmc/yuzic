import { rankMostPlayedTracks } from './mostPlayed'

describe('rankMostPlayedTracks', () => {
  it('ranks this artist\'s tracks by play count, descending', () => {
    const tracks = [
      { id: 'a', artistId: 'artist-1' },
      { id: 'b', artistId: 'artist-1' },
      { id: 'c', artistId: 'artist-1' },
    ]
    const playCounts = { a: 3, b: 10, c: 1 }

    expect(rankMostPlayedTracks(tracks, playCounts, 'artist-1').map(t => t.id))
      .toEqual(['b', 'a', 'c'])
  })

  it('excludes tracks by other artists', () => {
    const tracks = [
      { id: 'a', artistId: 'artist-1' },
      { id: 'b', artistId: 'artist-2' },
    ]
    const playCounts = { a: 5, b: 100 }

    expect(rankMostPlayedTracks(tracks, playCounts, 'artist-1').map(t => t.id)).toEqual(['a'])
  })

  it('excludes tracks with zero plays instead of showing a list of zeros', () => {
    const tracks = [
      { id: 'a', artistId: 'artist-1' },
      { id: 'b', artistId: 'artist-1' },
    ]
    const playCounts = { a: 0 }

    expect(rankMostPlayedTracks(tracks, playCounts, 'artist-1')).toEqual([])
  })

  it('respects the limit', () => {
    const tracks = Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, artistId: 'artist-1' }))
    const playCounts = Object.fromEntries(tracks.map((t, i) => [t.id, i + 1]))

    expect(rankMostPlayedTracks(tracks, playCounts, 'artist-1', 5)).toHaveLength(5)
  })
})
