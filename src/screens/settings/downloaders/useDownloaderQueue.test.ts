import { renderHook, act } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { QUEUE_POLL_MS, useDownloaderQueue } from './useDownloaderQueue';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Jest hoists mock factories above the file, so the spy needs the `mock` prefix
// to be reachable from inside one.
const mockToast = jest.fn();
jest.mock('@backpackapp-io/react-native-toast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

type Listener = (state: string) => void;

type Record = { id: string };

const config = { serverUrl: 'http://slskd:5030', apiKey: 'key' };

describe('useDownloaderQueue', () => {
  let listeners: Listener[] = [];

  beforeEach(() => {
    jest.useFakeTimers();
    mockToast.mockClear();
    listeners = [];
    (AppState as any).currentState = 'active';
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation(((_event: string, listener: Listener) => {
        listeners.push(listener);
        return { remove: jest.fn() } as any;
      }) as any);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  async function emit(state: string) {
    await act(async () => {
      listeners.forEach((listener) => listener(state));
    });
  }

  function fetcher(queue: Record[] = [], finished: Record[] = []) {
    return jest.fn(async () => ({ currentQueue: queue, finishedItems: finished }));
  }

  it('reads the queue once on mount while authenticated', async () => {
    const fetchQueue = fetcher([{ id: 'a' }]);
    const { result } = await renderHook(() => useDownloaderQueue(config, true, fetchQueue));

    await act(async () => {});

    expect(fetchQueue).toHaveBeenCalledTimes(1);
    expect(result.current.queue).toEqual([{ id: 'a' }]);
  });

  it('does not poll when not authenticated', async () => {
    const fetchQueue = fetcher();
    await renderHook(() => useDownloaderQueue(config, false, fetchQueue));

    await act(async () => {
      await jest.advanceTimersByTimeAsync(QUEUE_POLL_MS * 3);
    });

    expect(fetchQueue).not.toHaveBeenCalled();
  });

  it('does not poll without credentials', async () => {
    const fetchQueue = fetcher();
    await renderHook(() =>
      useDownloaderQueue({ serverUrl: '', apiKey: '' }, true, fetchQueue)
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(QUEUE_POLL_MS * 3);
    });

    expect(fetchQueue).not.toHaveBeenCalled();
  });

  it('keeps polling on the interval while foregrounded', async () => {
    const fetchQueue = fetcher([{ id: 'a' }]);
    await renderHook(() => useDownloaderQueue(config, true, fetchQueue));

    await act(async () => {
      await jest.advanceTimersByTimeAsync(QUEUE_POLL_MS * 2);
    });
    const afterTwoIntervals = fetchQueue.mock.calls.length;
    expect(afterTwoIntervals).toBeGreaterThan(1);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(QUEUE_POLL_MS * 3);
    });

    expect(fetchQueue.mock.calls.length).toBeGreaterThan(afterTwoIntervals);
  });

  it('stops polling once the app is backgrounded', async () => {
    // The regression this guards: the old screens ran a bare setInterval, so
    // the queue kept being fetched after the user left the app.
    const fetchQueue = fetcher([{ id: 'a' }]);
    await renderHook(() => useDownloaderQueue(config, true, fetchQueue));

    await act(async () => {});
    await emit('background');
    const callsWhenBackgrounded = fetchQueue.mock.calls.length;

    await act(async () => {
      await jest.advanceTimersByTimeAsync(QUEUE_POLL_MS * 5);
    });

    expect(fetchQueue.mock.calls.length).toBe(callsWhenBackgrounded);
  });

  it('reads immediately on returning to the foreground', async () => {
    const fetchQueue = fetcher([{ id: 'a' }]);
    await renderHook(() => useDownloaderQueue(config, true, fetchQueue));

    await act(async () => {});
    await emit('background');
    const backgroundCalls = fetchQueue.mock.calls.length;

    await emit('active');

    expect(fetchQueue.mock.calls.length).toBe(backgroundCalls + 1);
  });

  it('surfaces a read failure instead of swallowing it', async () => {
    // slskd used to only console.warn here, so a broken connection looked like
    // an empty queue.
    const fetchQueue = jest.fn().mockRejectedValue(new Error('down'));
    const { result } = await renderHook(() => useDownloaderQueue(config, true, fetchQueue));

    await act(async () => {});

    expect(result.current.hasError).toBe(true);
  });

  it('clears the error once a later read succeeds', async () => {
    const fetchQueue = jest
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValue({ currentQueue: [{ id: 'a' }], finishedItems: [] });
    const { result } = await renderHook(() => useDownloaderQueue(config, true, fetchQueue));

    await act(async () => {});
    expect(result.current.hasError).toBe(true);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(QUEUE_POLL_MS);
    });

    expect(result.current.hasError).toBe(false);
  });

  it('shows the spinner only for the first read, even when the queue is empty', async () => {
    // An empty queue is a real result: treating it as "not loaded yet" flashed
    // the spinner over the empty-state message on every tick.
    const fetchQueue = fetcher([]);
    const { result } = await renderHook(() => useDownloaderQueue(config, true, fetchQueue));

    await act(async () => {});
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(QUEUE_POLL_MS);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('does not stack reads when one is slower than the interval', async () => {
    let release: (() => void) | undefined;
    const fetchQueue = jest.fn(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ currentQueue: [], finishedItems: [] });
        })
    );
    await renderHook(() => useDownloaderQueue(config, true, fetchQueue as any));

    await act(async () => {
      await jest.advanceTimersByTimeAsync(QUEUE_POLL_MS * 4);
    });

    expect(fetchQueue).toHaveBeenCalledTimes(1);

    await act(async () => {
      release?.();
    });
  });

  it('announces finished downloads', async () => {
    const fetchQueue = fetcher([], [{ id: 'done' }]);
    await renderHook(() => useDownloaderQueue(config, true, fetchQueue));

    await act(async () => {});

    expect(mockToast).toHaveBeenCalledWith('settings.downloaders.downloadComplete');
  });
});
