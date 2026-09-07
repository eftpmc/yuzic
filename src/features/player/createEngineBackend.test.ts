import type { MediaItem } from './mediaItem';

/**
 * The engine backend's own behaviour, with the native module faked.
 *
 * Two things are worth testing here and neither is the forwarding. The first
 * is the optimistic queue edit: `getQueue()` answers synchronously, so the
 * backend has to predict what the engine will do and it duplicates the
 * engine's index rule in TypeScript to manage it. Duplicated rules drift, and
 * these tests are the thing that notices.
 *
 * The second is that a failed call becomes an event. Commands are fired and
 * not awaited, so anything that fails quietly is a track that never plays with
 * nothing in the log to say why.
 */

const mockCalls: { name: string; args: unknown[] }[] = [];
let mockListener: ((event: unknown) => void) | null = null;
let mockFailing: string | null = null;

const mockEngine = new Proxy(
  {},
  {
    get(_target, name: string) {
      if (name === 'addListener') {
        return (fn: (event: unknown) => void) => {
          mockListener = fn;
          return () => { mockListener = null; };
        };
      }
      return (...args: unknown[]) => {
        mockCalls.push({ name, args });
        return name === mockFailing ? Promise.reject(new Error('nope')) : Promise.resolve();
      };
    },
  }
);

jest.mock('yuzic-engine', () => ({ YuzicEngine: mockEngine }), { virtual: true });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createEngineBackend } = require('./createEngineBackend');

const item = (id: string, over: Partial<MediaItem> = {}): MediaItem => ({
  mediaId: id,
  title: id,
  artist: 'Someone',
  albumTitle: 'An Album',
  duration: 100,
  url: `https://example/${id}`,
  ...over,
});

const named = (name: string) => mockCalls.filter(call => call.name === name);

/**
 * Drain the microtask queue.
 *
 * Needed because the backend fires commands without awaiting them: a rejection
 * travels through an async function that adopted the inner promise, which is
 * several ticks, and `setup` subscribes only after its own await. Counting
 * `Promise.resolve()`s here would be pinning the number of awaits in the
 * implementation, which is not the behaviour under test.
 */
const flush = () => new Promise(resolve => setImmediate(resolve));

beforeEach(() => {
  mockCalls.length = 0;
  mockListener = null;
  mockFailing = null;
  // Several tests here make calls fail on purpose, and `fire` warns on every
  // failure so a release build leaves a trace. Silenced rather than tolerated:
  // expected output that looks like a problem trains you to ignore the run.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the queue the app can read straight away', () => {
  it('reflects a set queue before the engine has confirmed anything', () => {
    const backend = createEngineBackend();
    backend.setMediaItems([item('a'), item('b')], 1);
    // No await anywhere — this is what a caller doing `setMediaItems(...)`
    // then `getQueue()` on the next line sees.
    expect(backend.getQueue().map((i: MediaItem) => i.mediaId)).toEqual(['a', 'b']);
    expect(backend.getActiveMediaItemIndex()).toBe(1);
    expect(backend.getActiveMediaItem()?.mediaId).toBe('b');
  });

  it('keeps the playing track when something is inserted above it', () => {
    const backend = createEngineBackend();
    backend.setMediaItems([item('a'), item('b'), item('c')], 1);
    backend.insertMediaItem(0, item('new'));
    // Same rule the engine applies natively: inserting at or before the
    // playhead pushes it down so the music does not jump.
    expect(backend.getActiveMediaItem()?.mediaId).toBe('b');
    expect(backend.getQueue().map((i: MediaItem) => i.mediaId)).toEqual(['new', 'a', 'b', 'c']);
  });

  it('keeps the playing track when something above it is removed', () => {
    const backend = createEngineBackend();
    backend.setMediaItems([item('a'), item('b'), item('c')], 2);
    backend.removeMediaItem(0);
    expect(backend.getActiveMediaItem()?.mediaId).toBe('c');
  });

  it('follows the playing track when it is the one moved', () => {
    const backend = createEngineBackend();
    backend.setMediaItems([item('a'), item('b'), item('c')], 0);
    backend.moveMediaItem(0, 2);
    expect(backend.getActiveMediaItem()?.mediaId).toBe('a');
    expect(backend.getActiveMediaItemIndex()).toBe(2);
  });

  it('keeps the playing track when something moves across it', () => {
    const backend = createEngineBackend();
    backend.setMediaItems([item('a'), item('b'), item('c'), item('d')], 2);
    backend.moveMediaItem(0, 3);
    expect(backend.getActiveMediaItem()?.mediaId).toBe('c');
  });

  it('empties on clear', () => {
    const backend = createEngineBackend();
    backend.setMediaItems([item('a')], 0);
    backend.clear();
    expect(backend.getQueue()).toEqual([]);
    // Null, not undefined, and not index 0 — "nothing is active" is a distinct
    // answer that the app branches on, and rntp says it the same way.
    expect(backend.getActiveMediaItem()).toBeNull();
    expect(backend.getActiveMediaItemIndex()).toBeNull();
  });
});

describe('talking to the engine', () => {
  it('translates the app repeat vocabulary into the engine one', () => {
    const backend = createEngineBackend();
    backend.setRepeatMode('track');
    backend.setRepeatMode('queue');
    backend.setRepeatMode('off');
    expect(named('setRepeatMode').map(c => c.args[0])).toEqual(['one', 'all', 'off']);
  });

  it('sends tracks in the engine shape, not the app one', () => {
    const backend = createEngineBackend();
    backend.setMediaItems([item('a', { url: { uri: 'file:///x.flac' } })], 0);
    const sent = named('setQueue')[0].args[0] as { uri: string; id: string }[];
    expect(sent[0]).toMatchObject({ id: 'a', uri: 'file:///x.flac' });
  });
});

describe('failures the app would otherwise never see', () => {
  it('turns a rejected call into an error event', async () => {
    const backend = createEngineBackend();
    const seen: unknown[] = [];
    backend.addListener((event: unknown) => seen.push(event));

    mockFailing = 'play';
    backend.play();
    // The rejection is caught inside; let it get there.
    await flush();

    expect(seen).toContainEqual(
      expect.objectContaining({ type: 'error', code: 'ENGINE_CALL_FAILED' })
    );
  });

  it('names the call that failed, so the log says which one', async () => {
    const backend = createEngineBackend();
    const seen: { message?: string }[] = [];
    backend.addListener((event: { message?: string }) => seen.push(event));

    mockFailing = 'seekTo';
    backend.seekTo(30);
    await flush();

    expect(seen[0]?.message).toContain('seekTo');
  });
});

describe('events from the engine', () => {
  it('re-emits a track change and moves the shadow with it', async () => {
    const backend = createEngineBackend();
    backend.setup();
    await flush();
    backend.setMediaItems([item('a'), item('b')], 0);

    const seen: { type: string }[] = [];
    backend.addListener((event: { type: string }) => seen.push(event));

    mockListener?.({ type: 'trackChange', index: 1, id: 'b' });

    expect(backend.getActiveMediaItemIndex()).toBe(1);
    expect(seen).toContainEqual(expect.objectContaining({ type: 'trackChange', index: 1 }));
  });

  it('serves progress the engine pushed, in the app shape', async () => {
    const backend = createEngineBackend();
    backend.setup();
    await flush();
    mockListener?.({
      type: 'progress',
      progress: { positionSec: 10, durationSec: 200, bufferedSec: 25 },
    });
    // buffered arrives absolute and is served as remaining runway.
    expect(backend.getProgress()).toEqual({ position: 10, duration: 200, buffered: 15 });
  });

  it('stops delivering to a listener that unsubscribed', async () => {
    const backend = createEngineBackend();
    backend.setup();
    await flush();
    const seen: unknown[] = [];
    const off = backend.addListener((event: unknown) => seen.push(event));
    off();
    mockListener?.({ type: 'stateChange', state: 'playing' });
    expect(seen).toEqual([]);
  });
});
