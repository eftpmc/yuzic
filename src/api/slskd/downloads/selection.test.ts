import {
  selectAlbumDirectory,
  selectTrackFile,
  type SearchFile,
  type SearchResponseItem,
} from './selection';

function file(filename: string, overrides: Partial<SearchFile> = {}): SearchFile {
  return {
    filename,
    size: 40_000_000,
    code: 1,
    isLocked: false,
    extension: filename.slice(filename.lastIndexOf('.')),
    ...overrides,
  };
}

function response(
  username: string,
  filenames: string[],
  overrides: Partial<SearchResponseItem> = {}
): SearchResponseItem {
  return {
    username,
    files: filenames.map((name) => file(name)),
    hasFreeUploadSlot: true,
    ...overrides,
  };
}

describe('selectAlbumDirectory', () => {
  it('picks the directory naming the requested album', () => {
    const chosen = selectAlbumDirectory(
      [
        response('alice', [
          '@@music\\Radiohead\\In Rainbows\\01 - 15 Step.flac',
          '@@music\\Radiohead\\In Rainbows\\02 - Bodysnatchers.flac',
        ]),
      ],
      'In Rainbows',
      'Radiohead'
    );

    expect(chosen?.username).toBe('alice');
    expect(chosen?.files).toHaveLength(2);
  });

  it('does not queue a different album from a user with a bigger share', () => {
    // The regression this guards: search for "<artist> <album>" also returns
    // users who matched on the artist alone. Ranking by share size handed them
    // whichever album that user had most files of.
    const chosen = selectAlbumDirectory(
      [
        response('bigsharer', [
          '@@music\\Radiohead\\OK Computer\\01 - Airbag.flac',
          '@@music\\Radiohead\\OK Computer\\02 - Paranoid Android.flac',
          '@@music\\Radiohead\\OK Computer\\03 - Subterranean.flac',
          '@@music\\Radiohead\\Kid A\\01 - Everything In Its Right Place.flac',
        ]),
        response('smallsharer', ['@@d\\Radiohead - In Rainbows\\01 - 15 Step.flac']),
      ],
      'In Rainbows',
      'Radiohead'
    );

    expect(chosen?.username).toBe('smallsharer');
  });

  it('returns null when no result names the album', () => {
    const chosen = selectAlbumDirectory(
      [
        response('alice', [
          '@@music\\Radiohead\\OK Computer\\01 - Airbag.flac',
          '@@music\\Radiohead\\Kid A\\01 - Idioteque.flac',
        ]),
      ],
      'In Rainbows',
      'Radiohead'
    );

    expect(chosen).toBeNull();
  });

  it('prefers the directory that also names the artist', () => {
    const chosen = selectAlbumDirectory(
      [
        response('cover', ['@@d\\Karaoke Hits\\In Rainbows\\01 - 15 Step.flac']),
        response('real', ['@@d\\Radiohead - In Rainbows (2007)\\01 - 15 Step.flac']),
      ],
      'In Rainbows',
      'Radiohead'
    );

    expect(chosen?.username).toBe('real');
  });

  it('prefers a free upload slot over a queued peer', () => {
    const chosen = selectAlbumDirectory(
      [
        response('queued', ['@@d\\Radiohead - In Rainbows\\01 - 15 Step.flac'], {
          hasFreeUploadSlot: false,
        }),
        response('free', ['@@d\\Radiohead - In Rainbows\\01 - 15 Step.flac']),
      ],
      'In Rainbows',
      'Radiohead'
    );

    expect(chosen?.username).toBe('free');
  });

  it('prefers flac over mp3 when both name the album', () => {
    const chosen = selectAlbumDirectory(
      [
        response('lossy', ['@@d\\Radiohead - In Rainbows\\01 - 15 Step.mp3']),
        response('lossless', ['@@d\\Radiohead - In Rainbows\\01 - 15 Step.flac']),
      ],
      'In Rainbows',
      'Radiohead'
    );

    expect(chosen?.username).toBe('lossless');
  });

  it('prefers the more complete directory when quality ties', () => {
    const chosen = selectAlbumDirectory(
      [
        response('partial', ['@@d\\Radiohead - In Rainbows\\01 - 15 Step.flac']),
        response('complete', [
          '@@e\\Radiohead - In Rainbows\\01 - 15 Step.flac',
          '@@e\\Radiohead - In Rainbows\\02 - Bodysnatchers.flac',
        ]),
      ],
      'In Rainbows',
      'Radiohead'
    );

    expect(chosen?.username).toBe('complete');
  });

  it('matches through punctuation and accent differences', () => {
    const chosen = selectAlbumDirectory(
      [response('alice', ['@@d\\Sigur Ros - Takk...\\01 - Glosoli.flac'])],
      'Takk…',
      'Sigur Rós'
    );

    expect(chosen?.username).toBe('alice');
  });

  it('accepts a flat share when every file names the album', () => {
    const chosen = selectAlbumDirectory(
      [
        response('flat', [
          '@@d\\Music\\Radiohead - In Rainbows - 01 - 15 Step.flac',
          '@@d\\Music\\Radiohead - In Rainbows - 02 - Bodysnatchers.flac',
        ]),
      ],
      'In Rainbows',
      'Radiohead'
    );

    expect(chosen?.files).toHaveLength(2);
  });

  it('ignores locked files and unsupported extensions', () => {
    const chosen = selectAlbumDirectory(
      [
        {
          username: 'alice',
          hasFreeUploadSlot: true,
          files: [
            file('@@d\\Radiohead - In Rainbows\\01 - 15 Step.flac', { isLocked: true }),
            file('@@d\\Radiohead - In Rainbows\\cover.jpg'),
            file('@@d\\Radiohead - In Rainbows\\02 - Bodysnatchers.flac'),
          ],
        },
      ],
      'In Rainbows',
      'Radiohead'
    );

    expect(chosen?.files.map((f) => f.filename)).toEqual([
      '@@d\\Radiohead - In Rainbows\\02 - Bodysnatchers.flac',
    ]);
  });

  it('returns null for an empty result set', () => {
    expect(selectAlbumDirectory([], 'In Rainbows', 'Radiohead')).toBeNull();
  });

  it('returns null when the album title normalises to nothing', () => {
    const chosen = selectAlbumDirectory(
      [response('alice', ['@@d\\Radiohead\\01 - 15 Step.flac'])],
      '???',
      'Radiohead'
    );

    expect(chosen).toBeNull();
  });
});

describe('selectTrackFile', () => {
  it('picks a file whose name contains the track title', () => {
    const chosen = selectTrackFile(
      [
        response('alice', [
          '@@d\\Radiohead\\In Rainbows\\01 - 15 Step.flac',
          '@@d\\Radiohead\\In Rainbows\\02 - Bodysnatchers.flac',
        ]),
      ],
      'Bodysnatchers'
    );

    expect(chosen?.file.filename).toContain('Bodysnatchers');
  });

  it('prefers the higher bitrate when format and slot tie', () => {
    const chosen = selectTrackFile(
      [
        {
          username: 'alice',
          hasFreeUploadSlot: true,
          files: [
            file('@@d\\a\\Bodysnatchers.mp3', { bitRate: 192 }),
            file('@@d\\b\\Bodysnatchers.mp3', { bitRate: 320 }),
          ],
        },
      ],
      'Bodysnatchers'
    );

    expect(chosen?.file.bitRate).toBe(320);
  });

  it('returns null when nothing matches the title', () => {
    const chosen = selectTrackFile(
      [response('alice', ['@@d\\Radiohead\\In Rainbows\\01 - 15 Step.flac'])],
      'Bodysnatchers'
    );

    expect(chosen).toBeNull();
  });
});
