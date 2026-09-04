import type { AlbumBase } from '@/types';
import { buildGenreRows } from './genreList';

const album = (...genres: string[]) => ({ genres }) as Pick<AlbumBase, 'genres'>;

describe('buildGenreRows', () => {
  it('counts the albums carrying each genre', () => {
    const rows = buildGenreRows(
      ['Jazz', 'Rock'],
      [album('Jazz'), album('Jazz'), album('Rock')]
    );

    expect(rows).toEqual([
      { genre: 'Jazz', albumCount: 2 },
      { genre: 'Rock', albumCount: 1 },
    ]);
  });

  it('counts an album under each of its genres', () => {
    const rows = buildGenreRows(['Jazz', 'Fusion'], [album('Jazz', 'Fusion')]);

    expect(rows.map(row => row.albumCount)).toEqual([1, 1]);
  });

  it('leaves out a genre no album actually carries', () => {
    // The genre screen filters on an exact tag match, so offering one the tags
    // never mention would open an empty screen.
    const rows = buildGenreRows(['Jazz', 'Polka'], [album('Jazz')]);

    expect(rows.map(row => row.genre)).toEqual(['Jazz']);
  });

  it('does not match a genre the server spells differently', () => {
    // Same reason: "Hip-Hop" from the server does not select albums tagged
    // "Hip Hop", so it must not appear as a browsable row.
    const rows = buildGenreRows(['Hip-Hop'], [album('Hip Hop')]);

    expect(rows).toEqual([]);
  });

  it('sorts alphabetically for scanning', () => {
    const rows = buildGenreRows(
      ['Rock', 'Ambient', 'Jazz'],
      [album('Rock'), album('Ambient'), album('Jazz')]
    );

    expect(rows.map(row => row.genre)).toEqual(['Ambient', 'Jazz', 'Rock']);
  });

  it('ignores a duplicate genre from the server', () => {
    const rows = buildGenreRows(['Jazz', 'Jazz'], [album('Jazz')]);

    expect(rows).toHaveLength(1);
  });

  it('tolerates an album with no genres', () => {
    const rows = buildGenreRows(['Jazz'], [{ } as Pick<AlbumBase, 'genres'>, album('Jazz')]);

    expect(rows).toEqual([{ genre: 'Jazz', albumCount: 1 }]);
  });

  it('returns nothing for an empty library', () => {
    expect(buildGenreRows([], [])).toEqual([]);
    expect(buildGenreRows(['Jazz'], [])).toEqual([]);
  });
});
