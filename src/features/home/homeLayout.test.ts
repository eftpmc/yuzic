import {
  buildDiscoverySections,
  buildLibrarySections,
  buildResumeSections,
} from './homeLayout'

const discovery = (overrides: Partial<Parameters<typeof buildDiscoverySections>[0]> = {}) =>
  buildDiscoverySections({
    isOffline: false,
    hasLibrary: true,
    becauseSeeds: ['Radiohead'],
    topGenres: ['Jazz'],
    ...overrides,
  })

describe('buildResumeSections', () => {
  it('leads with what you were listening to', () => {
    expect(buildResumeSections().map(s => s.type)).toEqual(['quickPicks', 'recentlyPlayed'])
  })

  it('includes quick picks, which used to render outside the layout', () => {
    // It was hardcoded above the mapped sections, so it could not be ordered or
    // grouped with the rest.
    expect(buildResumeSections().some(s => s.type === 'quickPicks')).toBe(true)
  })
})

describe('buildLibrarySections', () => {
  it('offers the slices Library sort orders express less well', () => {
    expect(buildLibrarySections(true).map(s => s.type)).toEqual([
      'recentlyAdded',
      'favoriteAlbums',
      'mostPlayed',
      'randomAlbums',
    ])
  })

  it('is empty without a library, so its header has nothing to sit over', () => {
    // A new account would otherwise get a "From your library" heading with
    // nothing under it.
    expect(buildLibrarySections(false)).toEqual([])
  })
})

describe('buildDiscoverySections', () => {
  it('is empty offline, since every section here needs the network', () => {
    expect(discovery({ isOffline: true })).toEqual([])
  })

  it('always offers charts and top artists', () => {
    const types = discovery({ hasLibrary: false }).map(s => s.type)

    expect(types).toEqual(expect.arrayContaining(['charts', 'topArtists']))
  })

  it('drops the seeded sections without a library to seed them from', () => {
    const types = discovery({ hasLibrary: false }).map(s => s.type)

    expect(types).not.toContain('becauseYouListened')
    expect(types).not.toContain('genre')
  })

  it('carries the seed on each personalised section', () => {
    const sections = discovery({ becauseSeeds: ['Radiohead', 'Bowie'] })
    const seeded = sections.filter(s => s.type === 'becauseYouListened')

    expect(seeded.map(s => s.artistName)).toEqual(['Radiohead', 'Bowie'])
  })

  it('carries the genre on each genre section', () => {
    const sections = discovery({ topGenres: ['Jazz', 'Ambient'] })

    expect(sections.filter(s => s.type === 'genre').map(s => s.genre))
      .toEqual(['Jazz', 'Ambient'])
  })

  it('gives every section a distinct key', () => {
    const keys = discovery({ becauseSeeds: ['A', 'B'], topGenres: ['X', 'Y'] }).map(s => s.key)

    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('tiers together', () => {
  it('never repeats a section across tiers', () => {
    const all = [
      ...buildResumeSections(),
      ...buildLibrarySections(true),
      ...discovery(),
    ].map(s => s.type)

    expect(new Set(all).size).toBe(all.length)
  })

  it('shows nothing but resume for a new offline account', () => {
    expect(buildLibrarySections(false)).toEqual([])
    expect(discovery({ isOffline: true, hasLibrary: false })).toEqual([])
  })
})
