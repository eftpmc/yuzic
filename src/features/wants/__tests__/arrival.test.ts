import { findArrivedWants } from '../arrival';
import { makeLocalId } from '@/types/EntityId';
import type { Want } from '@/utils/redux/slices/wantsSlice';
import type { AlbumBase, SongBase } from '@/types';

const ALBUM_LOCAL_ID = makeLocalId({ kind: 'album', externalSource: 'deezer', externalNativeId: 'w-album-1' });
const TRACK_LOCAL_ID = makeLocalId({ kind: 'track', externalSource: 'deezer', externalNativeId: 'w-track-1' });
const PRESENT_LOCAL_ID = makeLocalId({ kind: 'album', externalSource: 'deezer', externalNativeId: 'present' });
const MISSING_LOCAL_ID = makeLocalId({ kind: 'album', externalSource: 'deezer', externalNativeId: 'missing' });

function albumWant(overrides: Partial<Want> = {}): Want {
  return {
    localId: ALBUM_LOCAL_ID,
    unit: 'album',
    title: 'Some Album',
    artist: 'Some Artist',
    origin: 'search',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function trackWant(overrides: Partial<Want> = {}): Want {
  return {
    localId: TRACK_LOCAL_ID,
    unit: 'track',
    title: 'Some Track',
    artist: 'Some Artist',
    origin: 'search',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function libraryAlbum(overrides: Partial<AlbumBase> = {}): AlbumBase {
  return {
    id: 'lib-album-1',
    title: 'Some Album',
    cover: { kind: 'none' },
    subtext: 'Some Artist',
    artist: { id: 'artist-1', name: 'Some Artist', cover: { kind: 'none' }, subtext: '' },
    year: 2020,
    genres: [],
    created: new Date(),
    ...overrides,
  };
}

function libraryTrack(overrides: Partial<SongBase> = {}): SongBase {
  return {
    id: 'lib-track-1',
    title: 'Some Track',
    artist: 'Some Artist',
    artistId: 'artist-1',
    cover: { kind: 'none' },
    duration: '180',
    albumId: 'lib-album-1',
    ...overrides,
  };
}

describe('findArrivedWants', () => {
  it('returns an album want when a normalized title/artist match is in library.albums', () => {
    const want = albumWant();
    const arrived = findArrivedWants([want], { albums: [libraryAlbum()] });
    expect(arrived).toEqual([want]);
  });

  it('returns an album want when the mbid matches even if title/artist differ in case/spacing', () => {
    const want = albumWant({
      title: '  SOME    Album ',
      externalIds: { mbid: 'mbid-123' },
    });
    const album = libraryAlbum({ title: 'Totally Different Title', mbid: 'mbid-123' });
    const arrived = findArrivedWants([want], { albums: [album] });
    expect(arrived).toEqual([want]);
  });

  it('returns a track want when the track is present in library.tracks', () => {
    const want = trackWant();
    const arrived = findArrivedWants([want], { albums: [], tracks: [libraryTrack()] });
    expect(arrived).toEqual([want]);
  });

  it('returns nothing when the album is absent from the library', () => {
    const want = albumWant();
    const arrived = findArrivedWants([want], { albums: [libraryAlbum({ title: 'Different Album' })] });
    expect(arrived).toEqual([]);
  });

  it('returns nothing when the track is absent from the library', () => {
    const want = trackWant();
    const arrived = findArrivedWants([want], { albums: [], tracks: [libraryTrack({ title: 'Different Track' })] });
    expect(arrived).toEqual([]);
  });

  it('leaves a wanted-but-not-present want out of the arrived set while others resolve', () => {
    const present = albumWant({ localId: PRESENT_LOCAL_ID });
    const missing = albumWant({ localId: MISSING_LOCAL_ID, title: 'Nope', artist: 'Nobody' });
    const arrived = findArrivedWants([present, missing], { albums: [libraryAlbum()] });
    expect(arrived).toEqual([present]);
  });

  it('returns nothing when library.tracks is omitted and a track want is checked', () => {
    const want = trackWant();
    const arrived = findArrivedWants([want], { albums: [] });
    expect(arrived).toEqual([]);
  });
});
