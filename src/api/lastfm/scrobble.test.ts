import { submitScrobble } from './scrobble';

const config = {
  apiKey: 'key',
  apiSecret: 'secret',
  sessionKey: 'session',
};

const originalFetch = global.fetch;

function captureParams() {
  const calls: URLSearchParams[] = [];
  global.fetch = jest.fn(async (_url: string, init?: RequestInit) => {
    calls.push(new URLSearchParams(String(init?.body ?? '')));
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' } as Response;
  }) as unknown as typeof fetch;
  return calls;
}

afterEach(() => {
  global.fetch = originalFetch;
});

describe('Last.fm submitScrobble', () => {
  it('sends the album so Last.fm can match the release', () => {
    const calls = captureParams();

    return submitScrobble(config, {
      artist: 'Radiohead',
      track: '15 Step',
      timestamp: 1_700_000_000,
      album: 'In Rainbows',
    }).then(() => {
      expect(calls[0].get('album')).toBe('In Rainbows');
      expect(calls[0].get('artist')).toBe('Radiohead');
      expect(calls[0].get('track')).toBe('15 Step');
      expect(calls[0].get('method')).toBe('track.scrobble');
    });
  });

  it('omits the album when the library does not know one', async () => {
    const calls = captureParams();

    await submitScrobble(config, {
      artist: 'Radiohead',
      track: '15 Step',
      timestamp: 1_700_000_000,
    });

    expect(calls[0].has('album')).toBe(false);
  });

  it('signs the request over the album too', async () => {
    // api_sig covers every parameter except format; omitting a sent parameter
    // from the signature makes Last.fm reject the call outright.
    const withAlbum = captureParams();
    await submitScrobble(config, {
      artist: 'Radiohead',
      track: '15 Step',
      timestamp: 1_700_000_000,
      album: 'In Rainbows',
    });
    const signatureWithAlbum = withAlbum[0].get('api_sig');

    const withoutAlbum = captureParams();
    await submitScrobble(config, {
      artist: 'Radiohead',
      track: '15 Step',
      timestamp: 1_700_000_000,
    });

    expect(signatureWithAlbum).not.toBe(withoutAlbum[0].get('api_sig'));
  });
});
