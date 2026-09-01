import {
  compareResults,
  dedupeAndSort,
  dedupeResults,
  resultKey,
  type SearchResult,
} from './searchRanking';

function result(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id: 'id-1',
    title: 'In Rainbows',
    subtext: 'Radiohead',
    cover: { kind: 'none' } as SearchResult['cover'],
    type: 'album',
    source: 'local',
    isDownloaded: false,
    ...overrides,
  };
}

const QUERY = 'in rainbows';

function titlesOf(results: SearchResult[]): string[] {
  return results.map(item => item.title);
}

describe('resultKey', () => {
  it('separates the same id across sources', () => {
    // The library and Deezer both return an album with id "1"; they are not
    // the same result.
    expect(resultKey(result({ id: '1', source: 'local' })))
      .not.toBe(resultKey(result({ id: '1', source: 'external' })));
  });

  it('separates the same id across types', () => {
    expect(resultKey(result({ id: '1', type: 'song' })))
      .not.toBe(resultKey(result({ id: '1', type: 'album' })));
  });
});

describe('dedupeResults', () => {
  it('collapses two copies of the same result', () => {
    const results = [result({ id: '1' }), result({ id: '1' })];

    expect(dedupeResults(results)).toHaveLength(1);
  });

  it('keeps the downloaded copy over the streamed one', () => {
    // An offline-playable result is strictly more useful.
    const streamed = result({ id: '1', isDownloaded: false });
    const downloaded = result({ id: '1', isDownloaded: true });

    expect(dedupeResults([streamed, downloaded])[0].isDownloaded).toBe(true);
  });

  it('keeps the downloaded copy regardless of arrival order', () => {
    const streamed = result({ id: '1', isDownloaded: false });
    const downloaded = result({ id: '1', isDownloaded: true });

    expect(dedupeResults([downloaded, streamed])[0].isDownloaded).toBe(true);
  });

  it('leaves genuinely distinct results alone', () => {
    const results = [
      result({ id: '1', type: 'song' }),
      result({ id: '1', type: 'album' }),
      result({ id: '1', source: 'external' }),
    ];

    expect(dedupeResults(results)).toHaveLength(3);
  });
});

describe('compareResults', () => {
  it('puts library results before external ones', () => {
    const local = result({ source: 'local' });
    const external = result({ source: 'external' });

    expect(compareResults(local, external, QUERY)).toBeLessThan(0);
    expect(compareResults(external, local, QUERY)).toBeGreaterThan(0);
  });

  it('puts downloaded before streamed within the same source', () => {
    const downloaded = result({ isDownloaded: true });
    const streamed = result({ isDownloaded: false });

    expect(compareResults(downloaded, streamed, QUERY)).toBeLessThan(0);
  });

  it('ranks source above downloaded state', () => {
    // A downloaded external result is not a thing, but the ordering must not
    // let any external result outrank a library one.
    const localStreamed = result({ source: 'local', isDownloaded: false });
    const externalDownloaded = result({ source: 'external', isDownloaded: true });

    expect(compareResults(localStreamed, externalDownloaded, QUERY)).toBeLessThan(0);
  });

  it('puts an exact title match first', () => {
    const exact = result({ title: 'In Rainbows' });
    const partial = result({ title: 'In Rainbows Disk 2' });

    expect(compareResults(exact, partial, QUERY)).toBeLessThan(0);
  });

  it('puts a title containing the query above one that does not', () => {
    const contains = result({ title: 'In Rainbows Live' });
    const other = result({ title: 'Kid A' });

    expect(compareResults(contains, other, QUERY)).toBeLessThan(0);
  });

  it('orders songs, then albums, then artists, then playlists', () => {
    const song = result({ type: 'song' });
    const album = result({ type: 'album' });
    const artist = result({ type: 'artist' });
    const playlist = result({ type: 'playlist' });

    expect(compareResults(song, album, QUERY)).toBeLessThan(0);
    expect(compareResults(album, artist, QUERY)).toBeLessThan(0);
    expect(compareResults(artist, playlist, QUERY)).toBeLessThan(0);
  });

  it('falls back to alphabetical so equal results keep a stable order', () => {
    // Without this, results of equal rank could reshuffle between keystrokes.
    const a = result({ title: 'Amnesiac' });
    const b = result({ title: 'Kid A' });

    expect(compareResults(a, b, QUERY)).toBeLessThan(0);
    expect(compareResults(b, a, QUERY)).toBeGreaterThan(0);
  });

  it('treats an identical pair as equal', () => {
    expect(compareResults(result(), result(), QUERY)).toBe(0);
  });

  it('matches titles case-insensitively', () => {
    const shouty = result({ title: 'IN RAINBOWS' });
    const other = result({ title: 'Kid A' });

    expect(compareResults(shouty, other, QUERY)).toBeLessThan(0);
  });
});

describe('dedupeAndSort', () => {
  it('applies the whole cascade in order', () => {
    const results = [
      result({ id: '1', title: 'Kid A', source: 'external' }),
      result({ id: '2', title: 'In Rainbows Live', source: 'local' }),
      result({ id: '3', title: 'In Rainbows', source: 'local', isDownloaded: true }),
      result({ id: '4', title: 'Amnesiac', source: 'local' }),
    ];

    expect(titlesOf(dedupeAndSort(results, QUERY))).toEqual([
      'In Rainbows',       // downloaded, and an exact match
      'In Rainbows Live',  // library, contains the query
      'Amnesiac',          // library, no match, alphabetically first
      'Kid A',             // external last
    ]);
  });

  it('de-duplicates before ordering', () => {
    const results = [
      result({ id: '1', title: 'In Rainbows', isDownloaded: false }),
      result({ id: '1', title: 'In Rainbows', isDownloaded: true }),
    ];

    const sorted = dedupeAndSort(results, QUERY);

    expect(sorted).toHaveLength(1);
    expect(sorted[0].isDownloaded).toBe(true);
  });

  it('handles no results', () => {
    expect(dedupeAndSort([], QUERY)).toEqual([]);
  });

  it('does not crash on an empty query', () => {
    // Every title "contains" an empty string; ordering must still be total.
    const results = [result({ id: '1', title: 'B' }), result({ id: '2', title: 'A' })];

    expect(titlesOf(dedupeAndSort(results, ''))).toEqual(['A', 'B']);
  });
});
