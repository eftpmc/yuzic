import { matchAlbumToLibrary, matchArtistToLibrary } from './libraryMatch'
import type { AlbumBase, Artist, ExternalAlbumBase, ExternalArtistBase } from '@/types'

const album = (overrides: Partial<AlbumBase> = {}): AlbumBase => ({
  id: 'local-album-1',
  title: 'OK Computer',
  cover: { kind: 'none' },
  subtext: '',
  artist: { id: 'local-artist-1', name: 'Radiohead', cover: { kind: 'none' }, subtext: '' },
  year: 1997,
  genres: [],
  created: new Date(0),
  ...overrides,
})

const artist = (overrides: Partial<Artist> = {}): Artist => ({
  id: 'local-artist-1',
  name: 'Radiohead',
  cover: { kind: 'none' },
  subtext: '',
  albumIds: [],
  ...overrides,
})

describe('matchAlbumToLibrary', () => {
  it('matches by externalIds.mbid when both sides have one', () => {
    const local = album({ mbid: 'mbid-abc' })
    const item: ExternalAlbumBase = {
      id: 'mb-release-group-id',
      title: 'Some Different Title',
      artist: 'Someone Else',
      cover: { kind: 'none' },
      subtext: '',
      externalSource: 'musicbrainz',
      externalIds: { mbid: 'mbid-abc' },
    }

    expect(matchAlbumToLibrary(item, [local])).toBe(local)
  })

  it('does not match a Deezer numeric id against a local mbid', () => {
    // Regression: the old predicate compared item.id (a Deezer numeric id)
    // directly against a.mbid, which only coincidentally worked for
    // MusicBrainz-sourced items where the native id happens to equal the mbid.
    const local = album({ mbid: '123456' })
    const item: ExternalAlbumBase = {
      id: '123456',
      title: 'Totally Different Album',
      artist: 'Totally Different Artist',
      cover: { kind: 'none' },
      subtext: '',
      externalSource: 'deezer',
      // no externalIds.mbid — Deezer doesn't provide one
    }

    expect(matchAlbumToLibrary(item, [local])).toBeNull()
  })

  it('falls back to normalized title + artist match when no mbid is available', () => {
    const local = album()
    const item: ExternalAlbumBase = {
      id: 'deezer-1',
      title: '  ok computer ',
      artist: 'RADIOHEAD',
      cover: { kind: 'none' },
      subtext: '',
      externalSource: 'deezer',
    }

    expect(matchAlbumToLibrary(item, [local])).toBe(local)
  })

  it('returns null when nothing matches', () => {
    const item: ExternalAlbumBase = {
      id: 'deezer-1',
      title: 'Some Album',
      artist: 'Some Artist',
      cover: { kind: 'none' },
      subtext: '',
    }

    expect(matchAlbumToLibrary(item, [album()])).toBeNull()
  })
})

describe('matchArtistToLibrary', () => {
  it('matches by externalIds.mbid when both sides have one', () => {
    const local = artist({ mbid: 'mbid-xyz' })
    const item: ExternalArtistBase = {
      id: 'deezer-artist-1',
      name: 'Different Name',
      cover: { kind: 'none' },
      subtext: '',
      externalIds: { mbid: 'mbid-xyz' },
    }

    expect(matchArtistToLibrary(item, [local])).toBe(local)
  })

  it('falls back to normalized name match when no mbid is available', () => {
    const local = artist()
    const item: ExternalArtistBase = {
      id: 'deezer-artist-1',
      name: '  RADIOHEAD ',
      cover: { kind: 'none' },
      subtext: '',
    }

    expect(matchArtistToLibrary(item, [local])).toBe(local)
  })

  it('returns null when nothing matches', () => {
    const item: ExternalArtistBase = {
      id: 'deezer-artist-1',
      name: 'Someone Else',
      cover: { kind: 'none' },
      subtext: '',
    }

    expect(matchArtistToLibrary(item, [artist()])).toBeNull()
  })
})
