import {
  getStatus,
  getPlaylist,
  setPlaylist,
  addToPlaylist,
  start,
  stop,
  skip,
  removeAt,
  clear,
  shuffle,
  setGain,
} from './index';
import type { NavidromeClient } from '../client';

function makeClient(response: unknown): { client: NavidromeClient; request: jest.Mock } {
  const request = jest.fn().mockResolvedValue({ 'subsonic-response': { status: 'ok', ...(response as object) } });
  return {
    request,
    client: {
      request,
      buildStreamUrl: jest.fn(),
      serverUrl: 'https://example',
      username: 'u',
      password: 'p',
    } as unknown as NavidromeClient,
  };
}

describe('getStatus', () => {
  it('reads currentIndex/playing/gain/position out of jukeboxStatus', async () => {
    const { client, request } = makeClient({
      jukeboxStatus: { currentIndex: 3, playing: true, gain: 0.5, position: 42 },
    });
    const status = await getStatus(client);
    expect(status).toEqual({ currentIndex: 3, playing: true, gain: 0.5, position: 42 });
    expect(request).toHaveBeenCalledWith('jukeboxControl.view', { action: 'get' });
  });

  it('defaults missing fields to safe zeros so UI can render on a fresh server', async () => {
    const { client } = makeClient({ jukeboxStatus: {} });
    const status = await getStatus(client);
    expect(status).toEqual({ currentIndex: 0, playing: false, gain: 0, position: 0 });
  });

  it('surfaces server errors with the server-provided message', async () => {
    const { client, request } = makeClient({});
    request.mockResolvedValueOnce({
      'subsonic-response': { status: 'failed', error: { code: 50, message: 'Jukebox disabled' } },
    });
    await expect(getStatus(client)).rejects.toThrow(/Jukebox disabled/);
  });
});

describe('getPlaylist', () => {
  it('normalises a single-entry response, since some servers omit the array', async () => {
    const { client } = makeClient({
      jukeboxPlaylist: {
        currentIndex: 0,
        playing: false,
        gain: 1,
        entry: { id: 's1', title: 'Only', artist: 'A', album: 'B', duration: 200 },
      },
    });
    const playlist = await getPlaylist(client);
    expect(playlist.entries).toEqual([{ id: 's1', title: 'Only', artist: 'A', album: 'B', duration: 200 }]);
  });

  it('normalises a multi-entry response', async () => {
    const { client } = makeClient({
      jukeboxPlaylist: {
        currentIndex: 1,
        playing: true,
        gain: 0.5,
        entry: [
          { id: 's1', title: 'One' },
          { id: 's2', title: 'Two' },
        ],
      },
    });
    const playlist = await getPlaylist(client);
    expect(playlist.entries.map(e => e.id)).toEqual(['s1', 's2']);
    expect(playlist.currentIndex).toBe(1);
    expect(playlist.playing).toBe(true);
  });

  it('returns an empty entries array when the response has none', async () => {
    const { client } = makeClient({ jukeboxPlaylist: {} });
    const playlist = await getPlaylist(client);
    expect(playlist.entries).toEqual([]);
  });
});

describe('setPlaylist', () => {
  it('sends the first id as `id` and the rest joined as `ids` — one round trip for large playlists', async () => {
    const { client, request } = makeClient({ jukeboxStatus: { currentIndex: 0, playing: false } });
    await setPlaylist(client, ['s1', 's2', 's3']);
    expect(request).toHaveBeenCalledWith('jukeboxControl.view', {
      action: 'set',
      id: 's1',
      ids: 's2,s3',
    });
  });

  it('sends `ids` only when there is more than one id', async () => {
    const { client, request } = makeClient({ jukeboxStatus: {} });
    await setPlaylist(client, ['single']);
    expect(request).toHaveBeenCalledWith('jukeboxControl.view', {
      action: 'set',
      id: 'single',
    });
  });

  it('routes an empty setPlaylist through `clear` — the two are semantically the same', async () => {
    const { client, request } = makeClient({ jukeboxStatus: {} });
    await setPlaylist(client, []);
    expect(request).toHaveBeenCalledWith('jukeboxControl.view', { action: 'clear' });
  });
});

describe('addToPlaylist', () => {
  it('appends via `add` when there are ids', async () => {
    const { client, request } = makeClient({ jukeboxStatus: {} });
    await addToPlaylist(client, ['a', 'b']);
    expect(request).toHaveBeenCalledWith('jukeboxControl.view', {
      action: 'add',
      id: 'a',
      ids: 'b',
    });
  });

  it('no-ops an empty add by reading status instead — nothing to send', async () => {
    const { client, request } = makeClient({ jukeboxStatus: {} });
    await addToPlaylist(client, []);
    expect(request).toHaveBeenCalledWith('jukeboxControl.view', { action: 'get' });
  });
});

describe('simple actions', () => {
  it('start/stop/clear/shuffle each hit their own action', async () => {
    const { client, request } = makeClient({ jukeboxStatus: {} });
    await start(client);
    await stop(client);
    await clear(client);
    await shuffle(client);
    expect(request.mock.calls.map(c => c[1].action)).toEqual(['start', 'stop', 'clear', 'shuffle']);
  });
});

describe('skip', () => {
  it('sends `index` alone when no offset is given — server keeps the previous playhead for other tracks', async () => {
    const { client, request } = makeClient({ jukeboxStatus: {} });
    await skip(client, 4);
    expect(request).toHaveBeenCalledWith('jukeboxControl.view', { action: 'skip', index: 4 });
  });

  it('sends `offset` when supplied, floored to whole seconds', async () => {
    const { client, request } = makeClient({ jukeboxStatus: {} });
    await skip(client, 2, 12.9);
    expect(request).toHaveBeenCalledWith('jukeboxControl.view', { action: 'skip', index: 2, offset: 12 });
  });

  it('never sends a negative offset', async () => {
    const { client, request } = makeClient({ jukeboxStatus: {} });
    await skip(client, 0, -5);
    expect(request).toHaveBeenCalledWith('jukeboxControl.view', { action: 'skip', index: 0, offset: 0 });
  });
});

describe('setGain', () => {
  it('clamps values above 1.0 rather than erroring', async () => {
    const { client, request } = makeClient({ jukeboxStatus: {} });
    await setGain(client, 2);
    expect(request).toHaveBeenCalledWith('jukeboxControl.view', { action: 'setGain', gain: 1 });
  });

  it('clamps negative values to 0 rather than erroring', async () => {
    const { client, request } = makeClient({ jukeboxStatus: {} });
    await setGain(client, -0.3);
    expect(request).toHaveBeenCalledWith('jukeboxControl.view', { action: 'setGain', gain: 0 });
  });
});

describe('removeAt', () => {
  it('sends `remove` with the target index', async () => {
    const { client, request } = makeClient({ jukeboxStatus: {} });
    await removeAt(client, 2);
    expect(request).toHaveBeenCalledWith('jukeboxControl.view', { action: 'remove', index: 2 });
  });
});
