import { compareByReleaseYearDesc, releaseYearLabel, releaseYearOf } from './discography'
import type { AlbumBase, ExternalAlbumBase } from '@/types'

const local = (id: string, year: number): AlbumBase => ({
  id,
  title: `Album ${id}`,
  cover: { kind: 'none' },
  subtext: '',
  artist: { id: 'a1', name: 'Artist', cover: { kind: 'none' }, subtext: '' },
  year,
  genres: [],
  created: new Date(0),
})

const external = (id: string, overrides: Partial<ExternalAlbumBase> = {}): ExternalAlbumBase => ({
  id,
  title: `Album ${id}`,
  artist: 'Artist',
  cover: { kind: 'none' },
  subtext: '',
  ...overrides,
})

describe('releaseYearOf', () => {
  it('reads the year field from local albums', () => {
    expect(releaseYearOf(local('l1', 1997))).toBe(1997)
  })

  it('treats a zero local year as unknown', () => {
    expect(releaseYearOf(local('l1', 0))).toBeNull()
  })

  it('reads releaseDate from external albums', () => {
    expect(releaseYearOf(external('e1', { releaseDate: '2007-10-10' }))).toBe(2007)
  })

  it('falls back to a year-shaped subtext when releaseDate is missing', () => {
    expect(releaseYearOf(external('e1', { subtext: '2000' }))).toBe(2000)
  })

  it('returns null when nothing date-like is available', () => {
    expect(releaseYearOf(external('e1'))).toBeNull()
  })
})

describe('compareByReleaseYearDesc', () => {
  it('sorts newest first across local and external albums', () => {
    const items = [
      local('l-1997', 1997),
      external('e-2007', { releaseDate: '2007-10-10' }),
      local('l-2016', 2016),
      external('e-2000', { subtext: '2000' }),
    ]

    expect([...items].sort(compareByReleaseYearDesc).map(a => a.id))
      .toEqual(['l-2016', 'e-2007', 'e-2000', 'l-1997'])
  })

  it('sinks unknown years to the end', () => {
    const items = [
      external('e-unknown'),
      local('l-1997', 1997),
    ]

    expect([...items].sort(compareByReleaseYearDesc).map(a => a.id))
      .toEqual(['l-1997', 'e-unknown'])
  })

  it('keeps insertion order on ties so owned stays ahead of external', () => {
    const items = [
      local('l-2007', 2007),
      external('e-2007', { releaseDate: '2007-01-01' }),
    ]

    expect([...items].sort(compareByReleaseYearDesc).map(a => a.id))
      .toEqual(['l-2007', 'e-2007'])
  })
})

describe('releaseYearLabel', () => {
  it('formats a known year', () => {
    expect(releaseYearLabel(local('l1', 1997))).toBe('1997')
    expect(releaseYearLabel(external('e1', { releaseDate: '2007-10-10' }))).toBe('2007')
  })

  it('returns null for unknown years so callers can fall back', () => {
    expect(releaseYearLabel(local('l1', 0))).toBeNull()
    expect(releaseYearLabel(external('e1'))).toBeNull()
  })
})
