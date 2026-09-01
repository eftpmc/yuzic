import {
  DOWNLOAD_SCHEMA_VERSION,
  extensionFromContentType,
  hasCurrentDownloadMetadata,
  headerValue,
  normalizeLocalUri,
  rerootLocalPath,
  restoreDownloadState,
  sanitizeFileName,
  type DownloadSnapshot,
  type LocalDownloadedTrackEntry,
} from './restore';

const DOC_DIR = 'file:///var/app/NEW-UUID/Documents/';

function track(
  overrides: Partial<LocalDownloadedTrackEntry> = {}
): LocalDownloadedTrackEntry {
  return {
    trackId: 'track-1',
    serverId: 'server-1',
    serverType: 'navidrome',
    coverKind: 'remote',
    localPath: `${DOC_DIR}downloads/audio/track-1.mp3`,
    schemaVersion: DOWNLOAD_SCHEMA_VERSION,
    ...overrides,
  } as LocalDownloadedTrackEntry;
}

function snapshot(overrides: Partial<DownloadSnapshot> = {}): DownloadSnapshot {
  return { tracks: [], collections: [], jobs: [], ...overrides };
}

describe('rerootLocalPath', () => {
  it('re-roots a path from a previous app container', () => {
    // iOS rotates the container UUID on reinstall; without this every download
    // still looks valid but points at a directory that no longer exists.
    const stored = 'file:///var/app/OLD-UUID/Documents/downloads/audio/track-1.mp3';

    expect(rerootLocalPath(stored, DOC_DIR)).toBe(
      `${DOC_DIR}downloads/audio/track-1.mp3`
    );
  });

  it('leaves a path under the current container alone', () => {
    const stored = `${DOC_DIR}downloads/audio/track-1.mp3`;

    expect(rerootLocalPath(stored, DOC_DIR)).toBe(stored);
  });

  it('leaves a path alone when there is no document directory', () => {
    const stored = 'file:///old/downloads/audio/track-1.mp3';

    expect(rerootLocalPath(stored, null)).toBe(stored);
  });

  it('leaves an unrecognisable path alone rather than corrupting it', () => {
    expect(rerootLocalPath('file:///elsewhere/music.mp3', DOC_DIR)).toBe(
      'file:///elsewhere/music.mp3'
    );
  });
});

describe('restoreDownloadState', () => {
  it('keeps a complete entry untouched', () => {
    const restored = restoreDownloadState(snapshot({ tracks: [track()] }), DOC_DIR);

    expect(restored.tracks).toHaveLength(1);
    expect(restored.stalePaths).toEqual([]);
    expect(restored.changed).toBe(false);
  });

  it('re-roots entries and reports that the snapshot needs rewriting', () => {
    const stale = track({
      localPath: 'file:///var/app/OLD-UUID/Documents/downloads/audio/track-1.mp3',
    });

    const restored = restoreDownloadState(snapshot({ tracks: [stale] }), DOC_DIR);

    expect(restored.tracks[0].localPath).toBe(`${DOC_DIR}downloads/audio/track-1.mp3`);
    expect(restored.changed).toBe(true);
  });

  it('drops an entry with no path at all', () => {
    const broken = track({ localPath: undefined as unknown as string });

    const restored = restoreDownloadState(snapshot({ tracks: [broken] }), DOC_DIR);

    expect(restored.tracks).toEqual([]);
    // Nothing to delete: there was never a usable path.
    expect(restored.stalePaths).toEqual([]);
    expect(restored.changed).toBe(true);
  });

  it('drops an entry missing playback metadata and reports its file as stale', () => {
    const incomplete = track({ schemaVersion: undefined, coverKind: undefined as any });

    const restored = restoreDownloadState(snapshot({ tracks: [incomplete] }), DOC_DIR);

    expect(restored.tracks).toEqual([]);
    expect(restored.stalePaths).toEqual([`${DOC_DIR}downloads/audio/track-1.mp3`]);
  });

  it('keeps a pre-schema entry that still carries every required field', () => {
    // Version alone must not condemn an entry, or an upgrade would wipe
    // downloads that are perfectly playable.
    const legacy = track({
      schemaVersion: undefined,
      originalTrack: {
        id: 'track-1',
        extraPayload: { serverId: 'server-1', serverType: 'navidrome', coverKind: 'remote' },
      },
    });

    const restored = restoreDownloadState(snapshot({ tracks: [legacy] }), DOC_DIR);

    expect(restored.tracks).toHaveLength(1);
    expect(restored.tracks[0].schemaVersion).toBe(DOWNLOAD_SCHEMA_VERSION);
  });

  it('strips collection references to tracks that did not survive', () => {
    const kept = track({ trackId: 'kept' });
    const dropped = track({ trackId: 'dropped', localPath: undefined as unknown as string });

    const restored = restoreDownloadState(
      snapshot({
        tracks: [kept, dropped],
        collections: [{ id: 'album-1', type: 'album', trackIds: ['kept', 'dropped'] } as any],
      }),
      DOC_DIR
    );

    expect(restored.collections[0].trackIds).toEqual(['kept']);
    expect(restored.changed).toBe(true);
  });

  it('removes a collection whose tracks are all gone', () => {
    const restored = restoreDownloadState(
      snapshot({
        collections: [{ id: 'album-1', type: 'album', trackIds: ['missing'] } as any],
      }),
      DOC_DIR
    );

    expect(restored.collections).toEqual([]);
    expect(restored.changed).toBe(true);
  });

  it('tolerates a collection with a malformed trackIds field', () => {
    const restored = restoreDownloadState(
      snapshot({ collections: [{ id: 'album-1', type: 'album' } as any] }),
      DOC_DIR
    );

    expect(restored.collections).toEqual([]);
  });

  it('drops jobs that carry no tracks', () => {
    const restored = restoreDownloadState(
      snapshot({
        jobs: [
          { id: 'job-1', type: 'track', tracks: [] } as any,
          { id: 'job-2', type: 'track', tracks: [{ id: 'track-1' }] } as any,
        ],
      }),
      DOC_DIR
    );

    expect(restored.jobs.map(job => job.id)).toEqual(['job-2']);
  });
});

describe('hasCurrentDownloadMetadata', () => {
  it('accepts an entry stamped with the current schema', () => {
    expect(hasCurrentDownloadMetadata(track())).toBe(true);
  });

  it('rejects a pre-schema entry missing its payload', () => {
    expect(hasCurrentDownloadMetadata(track({ schemaVersion: undefined }))).toBe(false);
  });
});

describe('extensionFromContentType', () => {
  it.each([
    ['audio/mpeg', 'mp3'],
    ['audio/flac', 'flac'],
    ['audio/x-flac', 'flac'],
    ['audio/ogg', 'ogg'],
    ['audio/opus', 'opus'],
    ['audio/mp4', 'm4a'],
    ['audio/x-m4a', 'm4a'],
    ['audio/aac', 'aac'],
    ['audio/wav', 'wav'],
  ])('maps %s to .%s', (mime, extension) => {
    expect(extensionFromContentType(mime)).toBe(extension);
  });

  it('ignores parameters and casing', () => {
    expect(extensionFromContentType('Audio/FLAC; charset=binary')).toBe('flac');
  });

  it('falls back to mp3 for an unknown or absent type', () => {
    expect(extensionFromContentType('application/octet-stream')).toBe('mp3');
    expect(extensionFromContentType(undefined)).toBe('mp3');
  });
});

describe('headerValue', () => {
  it('matches a header name case-insensitively', () => {
    expect(headerValue({ 'content-type': 'audio/flac' }, 'Content-Type')).toBe('audio/flac');
    expect(headerValue({ 'Content-Type': 'audio/flac' }, 'content-type')).toBe('audio/flac');
  });

  it('returns undefined when absent', () => {
    expect(headerValue({}, 'Content-Type')).toBeUndefined();
    expect(headerValue(undefined, 'Content-Type')).toBeUndefined();
  });
});

describe('sanitizeFileName', () => {
  it('replaces characters that are unsafe in a path', () => {
    expect(sanitizeFileName('track/../id')).toBe('track-id');
  });

  it('trims separators from both ends', () => {
    expect(sanitizeFileName('///abc///')).toBe('abc');
  });

  it('caps the length', () => {
    expect(sanitizeFileName('a'.repeat(200))).toHaveLength(80);
  });

  it('always yields a usable name', () => {
    expect(sanitizeFileName('///')).toBe('track');
    expect(sanitizeFileName('')).toBe('track');
  });
});

describe('normalizeLocalUri', () => {
  it('adds a file scheme to a bare path', () => {
    expect(normalizeLocalUri('/var/app/track.mp3')).toBe('file:///var/app/track.mp3');
  });

  it('leaves an existing scheme alone', () => {
    expect(normalizeLocalUri('file:///var/app/track.mp3')).toBe('file:///var/app/track.mp3');
    expect(normalizeLocalUri('https://example.test/a.mp3')).toBe('https://example.test/a.mp3');
  });
});
