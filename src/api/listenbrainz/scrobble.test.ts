import { submitScrobble } from './scrobble';

// Stands in for the Expo manifest, which isn't available to a unit test.
// jest.mock is hoisted above the imports, so this still applies to the module
// under test despite sitting below it.
jest.mock('@/constants/appVersion', () => ({ APP_VERSION: '9.9.9' }));

const config = { username: 'listener', token: 'token' };
const originalFetch = global.fetch;

function captureBodies() {
  const bodies: any[] = [];
  global.fetch = jest.fn(async (_url: string, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body ?? '{}')));
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' } as Response;
  }) as unknown as typeof fetch;
  return bodies;
}

afterEach(() => {
  global.fetch = originalFetch;
});

describe('ListenBrainz submitScrobble', () => {
  it('sends the album as release_name', async () => {
    const bodies = captureBodies();

    await submitScrobble(config, {
      artist: 'Radiohead',
      track: '15 Step',
      listenedAt: 1_700_000_000,
      album: 'In Rainbows',
    });

    expect(bodies[0].payload[0].track_metadata).toMatchObject({
      artist_name: 'Radiohead',
      track_name: '15 Step',
      release_name: 'In Rainbows',
    });
  });

  it('omits release_name when the library does not know an album', async () => {
    const bodies = captureBodies();

    await submitScrobble(config, {
      artist: 'Radiohead',
      track: '15 Step',
      listenedAt: 1_700_000_000,
    });

    expect(bodies[0].payload[0].track_metadata).not.toHaveProperty('release_name');
  });

  it('identifies the client with the running app version', async () => {
    const bodies = captureBodies();

    await submitScrobble(config, {
      artist: 'Radiohead',
      track: '15 Step',
      listenedAt: 1_700_000_000,
    });

    expect(bodies[0].payload[0].track_metadata.additional_info).toMatchObject({
      submission_client: 'Yuzic',
      submission_client_version: '9.9.9',
    });
  });

  it('keeps the listen timestamp it was given', async () => {
    // A replayed scrobble must record when the play happened, not when it synced.
    const bodies = captureBodies();

    await submitScrobble(config, {
      artist: 'Radiohead',
      track: '15 Step',
      listenedAt: 1_600_000_000,
    });

    expect(bodies[0].payload[0].listened_at).toBe(1_600_000_000);
    expect(bodies[0].listen_type).toBe('single');
  });
});
