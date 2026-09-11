import type { Server, Song } from '@/types';
import { mediaHeadersForSong } from './mediaHeaders';

// btoa may be absent in the jest environment; the Plex client's header builder
// uses global.btoa exactly as the app does at runtime.
if (typeof global.btoa !== 'function') {
  global.btoa = (s: string) => Buffer.from(s, 'binary').toString('base64');
}

const song = (over: Partial<Song> = {}): Song => ({
  id: 'song-1',
  title: 'Song',
  artist: 'Artist',
  artistId: 'artist-1',
  albumId: 'album-1',
  cover: { kind: 'none' },
  duration: '120',
  streamUrl: 'https://plex.example/library/parts/1/file.mp3?X-Plex-Token=t',
  ...over,
});

const server = (over: Partial<Server> = {}): Server => ({
  id: 'srv-1',
  type: 'plex',
  serverUrl: 'https://plex.example',
  username: 'zack',
  isAuthenticated: true,
  ...over,
});

const expectedAuth = `Basic ${global.btoa('proxy-user:proxy-password')}`;

describe('mediaHeadersForSong', () => {
  it('attaches the Basic auth header to both audio and artwork for a Basic-auth Plex server', () => {
    const result = mediaHeadersForSong(
      server({ basicAuth: { username: 'proxy-user', password: 'proxy-password' } }),
      song()
    );
    expect(result.headers).toEqual({ Authorization: expectedAuth });
    expect(result.artworkHeaders).toEqual({ Authorization: expectedAuth });
  });

  it('yields no headers for a token-only Plex server (no Basic auth)', () => {
    const result = mediaHeadersForSong(server({ basicAuth: undefined }), song());
    expect(result.headers).toBeUndefined();
    expect(result.artworkHeaders).toBeUndefined();
  });

  it('yields no headers for a Navidrome server even with Basic auth set', () => {
    // Navidrome signs its URLs; a Basic-auth field here would be a proxy for a
    // different provider and must not leak onto Plex-style header auth.
    const result = mediaHeadersForSong(
      server({ type: 'navidrome', basicAuth: { username: 'u', password: 'p' } }),
      song()
    );
    expect(result.headers).toBeUndefined();
    expect(result.artworkHeaders).toBeUndefined();
  });

  it('yields no headers when there is no active server', () => {
    expect(mediaHeadersForSong(null, song())).toEqual({});
    expect(mediaHeadersForSong(undefined, song())).toEqual({});
  });

  it('skips a locally-downloaded track even on a Basic-auth Plex server', () => {
    // A file:// path is already on disk and needs no server credentials.
    const result = mediaHeadersForSong(
      server({ basicAuth: { username: 'proxy-user', password: 'proxy-password' } }),
      song({ streamUrl: 'file:///downloads/audio/song-1.mp3' })
    );
    expect(result).toEqual({});
  });

  it('honours a mixed-queue song whose own source is a Basic-auth Plex', () => {
    // sourceServerType overrides the active server's type, so a Plex track in a
    // queue while another provider is active still gets its Plex headers.
    const result = mediaHeadersForSong(
      server({ type: 'plex', basicAuth: { username: 'proxy-user', password: 'proxy-password' } }),
      song({ sourceServerType: 'plex' })
    );
    expect(result.headers).toEqual({ Authorization: expectedAuth });
    expect(result.artworkHeaders).toEqual({ Authorization: expectedAuth });
  });

  it('skips a song whose source names a non-Plex provider', () => {
    const result = mediaHeadersForSong(
      server({ type: 'plex', basicAuth: { username: 'proxy-user', password: 'proxy-password' } }),
      song({ sourceServerType: 'navidrome' })
    );
    expect(result).toEqual({});
  });
});
