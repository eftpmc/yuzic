import { parseDirectory } from './directoryName';

describe('parseDirectory', () => {
  it('reads an "Artist - Album" folder', () => {
    expect(parseDirectory('@@abc\\Radiohead - In Rainbows')).toEqual({
      artistName: 'Radiohead',
      albumTitle: 'In Rainbows',
    });
  });

  it('reads an artist folder above an album folder', () => {
    expect(parseDirectory('@@abc\\Music\\Radiohead\\In Rainbows')).toEqual({
      artistName: 'Radiohead',
      albumTitle: 'In Rainbows',
    });
  });

  it('climbs out of a disc subfolder', () => {
    expect(parseDirectory('@@abc\\Radiohead\\In Rainbows\\CD2')).toEqual({
      artistName: 'Radiohead',
      albumTitle: 'In Rainbows',
    });
  });

  it('does not mistake a disc suffix for an artist', () => {
    expect(parseDirectory('@@abc\\Radiohead\\In Rainbows - Disc 1')).toEqual({
      artistName: 'Radiohead',
      albumTitle: 'In Rainbows - Disc 1',
    });
  });

  it('treats a leading year as a prefix, not an artist', () => {
    expect(parseDirectory('@@abc\\Radiohead\\2007 - In Rainbows')).toEqual({
      artistName: 'Radiohead',
      albumTitle: 'In Rainbows',
    });
  });

  it('ignores a generic container folder as an artist', () => {
    expect(parseDirectory('@@abc\\Downloads\\In Rainbows')).toEqual({
      artistName: undefined,
      albumTitle: 'In Rainbows',
    });
  });

  it('ignores the share root token', () => {
    expect(parseDirectory('@@abc\\In Rainbows')).toEqual({
      artistName: undefined,
      albumTitle: 'In Rainbows',
    });
  });

  it('ignores a drive letter', () => {
    expect(parseDirectory('D:\\Radiohead\\In Rainbows')).toEqual({
      artistName: 'Radiohead',
      albumTitle: 'In Rainbows',
    });
  });

  it('handles forward slashes', () => {
    expect(parseDirectory('/home/user/Radiohead/In Rainbows')).toEqual({
      artistName: 'Radiohead',
      albumTitle: 'In Rainbows',
    });
  });

  it('keeps release tags on the album title', () => {
    expect(parseDirectory('@@abc\\Radiohead - In Rainbows (2007) [FLAC]')).toEqual({
      artistName: 'Radiohead',
      albumTitle: 'In Rainbows (2007) [FLAC]',
    });
  });

  it('splits on the first separator only', () => {
    expect(parseDirectory('@@abc\\Radiohead - In Rainbows - 2007')).toEqual({
      artistName: 'Radiohead',
      albumTitle: 'In Rainbows - 2007',
    });
  });

  it('returns an empty title for an empty path', () => {
    expect(parseDirectory('')).toEqual({ albumTitle: '', artistName: undefined });
  });

  it('prefers the folder name over an artist folder when both could apply', () => {
    // "Artist - Album" inside an artist folder: the folder name is more specific.
    expect(parseDirectory('@@abc\\Radiohead\\Radiohead - In Rainbows')).toEqual({
      artistName: 'Radiohead',
      albumTitle: 'In Rainbows',
    });
  });
});
