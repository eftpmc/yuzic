import type { Song } from '@/types';
import type { ApiAdapter } from '@/api/types';
import { getAudiomuseQueueExtension } from '@/api/audiomuse/similarity';
import {
  resolveQueueFillProvider,
  createNativeSimilarityQueueFillProvider,
  createAudiomuseQueueFillProvider,
  type QueueFillProvider,
} from './queueProviders';

jest.mock('@/api/audiomuse/client', () => ({
  createAudiomuseClient: jest.fn(() => ({ request: jest.fn(), baseUrl: '' })),
}));
jest.mock('@/api/audiomuse/similarity', () => ({
  getAudiomuseQueueExtension: jest.fn(),
}));

const song = (id: string): Song => ({
  id,
  title: id,
  artist: 'Artist',
  artistId: 'artist-1',
  cover: { kind: 'none' },
  duration: '120',
  albumId: 'album-1',
  streamUrl: `https://example.com/${id}.mp3`,
});

function fakeApi(overrides: Partial<ApiAdapter> = {}): ApiAdapter {
  return {
    auth: { connect: jest.fn(), ping: jest.fn(), testUrl: jest.fn(), startScan: jest.fn(), disconnect: jest.fn() },
    albums: { list: jest.fn(), get: jest.fn() },
    artists: { list: jest.fn(), get: jest.fn() },
    genres: { list: jest.fn() },
    playlists: { list: jest.fn(), get: jest.fn(), create: jest.fn(), rename: jest.fn(), addSong: jest.fn(), removeSong: jest.fn(), delete: jest.fn() },
    starred: { list: jest.fn(), add: jest.fn(), remove: jest.fn() },
    songs: { get: jest.fn(async () => null), scrobble: jest.fn(), buildStreamUrl: jest.fn() },
    tracks: { list: jest.fn(), get: jest.fn() },
    similar: { getSimilarSongs: jest.fn(async () => []) },
    lyrics: { getBySongId: jest.fn() },
    search: { search: jest.fn() },
    ...overrides,
  } as ApiAdapter;
}

describe('resolveQueueFillProvider', () => {
  const provider = (id: QueueFillProvider['id'], available: boolean): QueueFillProvider => ({
    id,
    isAvailable: () => available,
    fetchExtension: jest.fn(async () => []),
  });

  it('returns the first available provider in priority order', () => {
    const audiomuse = provider('audiomuse', true);
    const native = provider('native-similarity', true);
    expect(resolveQueueFillProvider([audiomuse, native])).toBe(audiomuse);
  });

  it('skips unavailable providers', () => {
    const audiomuse = provider('audiomuse', false);
    const native = provider('native-similarity', true);
    expect(resolveQueueFillProvider([audiomuse, native])).toBe(native);
  });

  it('returns null when no provider is available', () => {
    expect(resolveQueueFillProvider([provider('audiomuse', false)])).toBeNull();
  });
});

describe('createNativeSimilarityQueueFillProvider', () => {
  it('is always available', () => {
    const provider = createNativeSimilarityQueueFillProvider(fakeApi());
    expect(provider.isAvailable()).toBe(true);
  });

  it('returns nothing when there are no seed songs', async () => {
    const provider = createNativeSimilarityQueueFillProvider(fakeApi());
    const result = await provider.fetchExtension({ recentSongs: [], excludeIds: new Set(), count: 10 });
    expect(result).toEqual([]);
  });

  it('seeds from the last recent song and excludes already-queued ids', async () => {
    const getSimilarSongs = jest.fn(async () => [song('a'), song('b'), song('c')]);
    const api = fakeApi({ similar: { getSimilarSongs } });
    const provider = createNativeSimilarityQueueFillProvider(api);

    const result = await provider.fetchExtension({
      recentSongs: [song('x'), song('seed')],
      excludeIds: new Set(['b']),
      count: 10,
    });

    expect(getSimilarSongs).toHaveBeenCalledWith('seed');
    expect(result.map(s => s.id).sort()).toEqual(['a', 'c']);
  });

  it('caps the result at count', async () => {
    const many = ['a', 'b', 'c', 'd', 'e'].map(song);
    const api = fakeApi({ similar: { getSimilarSongs: jest.fn(async () => many) } });
    const provider = createNativeSimilarityQueueFillProvider(api);

    const result = await provider.fetchExtension({ recentSongs: [song('seed')], excludeIds: new Set(), count: 2 });
    expect(result.length).toBe(2);
  });
});

describe('createAudiomuseQueueFillProvider', () => {
  const config = { serverUrl: 'http://audiomuse:8000', apiToken: 'token' };

  it('is available only when both serverUrl and apiToken are set', () => {
    expect(createAudiomuseQueueFillProvider(config, fakeApi()).isAvailable()).toBe(true);
    expect(createAudiomuseQueueFillProvider({ serverUrl: '', apiToken: 'token' }, fakeApi()).isAvailable()).toBe(false);
    expect(createAudiomuseQueueFillProvider({ serverUrl: config.serverUrl, apiToken: '' }, fakeApi()).isAvailable()).toBe(false);
  });

  it('resolves similarity refs to library songs, dropping unresolvable and excluded ones', async () => {
    (getAudiomuseQueueExtension as jest.Mock).mockResolvedValue([
      { itemId: 'a' },
      { itemId: 'b' },
      { itemId: 'missing' },
    ]);
    const get = jest.fn(async (id: string) => (id === 'missing' ? null : song(id)));
    const api = fakeApi({ songs: { get, scrobble: jest.fn(), buildStreamUrl: jest.fn() } });
    const provider = createAudiomuseQueueFillProvider(config, api);

    const result = await provider.fetchExtension({
      recentSongs: [song('seed')],
      excludeIds: new Set(['b']),
      count: 10,
    });

    expect(result.map(s => s.id)).toEqual(['a']);
  });

  it('requests a larger candidate pool than count and samples down, so repeat plays of the same seed vary', async () => {
    const refs = ['a', 'b', 'c', 'd', 'e'].map(id => ({ itemId: id }));
    (getAudiomuseQueueExtension as jest.Mock).mockResolvedValue(refs);
    const get = jest.fn(async (id: string) => song(id));
    const api = fakeApi({ songs: { get, scrobble: jest.fn(), buildStreamUrl: jest.fn() } });
    const provider = createAudiomuseQueueFillProvider(config, api);

    const result = await provider.fetchExtension({
      recentSongs: [song('seed')],
      excludeIds: new Set(),
      count: 3,
    });

    const [, opts] = (getAudiomuseQueueExtension as jest.Mock).mock.calls[0];
    expect(opts.limit).toBeGreaterThan(3);
    expect(result.length).toBe(3);
  });
});
