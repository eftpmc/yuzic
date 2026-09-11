import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useCodeAuth } from './useCodeAuth';
import type { CodeAuthApi } from '@/utils/servers/registry';
import type { BasicAuth } from '@/types';

/**
 * Code sign-in — Jellyfin's Quick Connect, Plex's PIN — is a state machine
 * with a timer in it, which is exactly the part worth testing away from a
 * screen. These pin the behaviours that were previously inline and untested.
 */
describe('useCodeAuth', () => {
  const serverUrl = 'https://example.test';

  function makeCodeAuth(overrides: Partial<CodeAuthApi> = {}): CodeAuthApi {
    return {
      begin: jest.fn(async () => ({ code: 'ABC123', handle: 'secret' })),
      poll: jest.fn(async () => null),
      pollIntervalMs: 1000,
      timeoutMs: 10_000,
      instructionKey: 'x.instruction',
      actionKey: 'x.action',
      ...overrides,
    };
  }

  // Fake timers are installed *after* the hook renders, never before. RNTL's
  // `renderHook` is async here and its internal flush runs on real timers, so
  // faking them first makes the render never settle and `result.current` comes
  // back null -- which reads exactly like the hook having crashed.
  //
  // `runOnlyPendingTimers` before handing the clock back matters for the same
  // reason in reverse: a test that leaves an interval queued lets its callback
  // fire under the *next* test's real clock, where it resolves a promise
  // against an unmounted tree and poisons that test instead of this one. Three
  // tests failed this way while passing in isolation.
  afterEach(() => {
    if (jest.isMockFunction(setTimeout)) jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  /** Render, then switch to fake timers so the polling interval is drivable. */
  async function renderWithFakeTimers<T>(fn: () => T) {
    jest.useRealTimers();
    const rendered = await renderHook(fn);
    jest.useFakeTimers();
    return rendered;
  }

  it('starts idle and shows the code once begun', async () => {
    const codeAuth = makeCodeAuth();
    const { result } = await renderWithFakeTimers(() => useCodeAuth({ codeAuth, serverUrl }));

    expect(result.current.phase).toEqual({ status: 'idle' });

    await act(async () => { await result.current.start(); });

    expect(result.current.phase).toEqual({ status: 'waiting', code: 'ABC123' });
  });

  it('reports the credentials once the user approves', async () => {
    const codeAuth = makeCodeAuth({
      poll: jest.fn(async () => ({ auth: { token: 't', userId: 'u' }, username: 'zack' })),
    });
    const { result } = await renderWithFakeTimers(() => useCodeAuth({ codeAuth, serverUrl }));

    await act(async () => { await result.current.start(); });
    await act(async () => { jest.advanceTimersByTime(1000); });

    await waitFor(() => {
      expect(result.current.phase).toEqual({
        status: 'approved',
        auth: { token: 't', userId: 'u' },
        username: 'zack',
      });
    });
  });

  it('keeps waiting while the poll says not yet', async () => {
    const codeAuth = makeCodeAuth();
    const { result } = await renderWithFakeTimers(() => useCodeAuth({ codeAuth, serverUrl }));

    await act(async () => { await result.current.start(); });
    await act(async () => { jest.advanceTimersByTime(3000); });

    expect(result.current.phase).toEqual({ status: 'waiting', code: 'ABC123' });
    expect(codeAuth.poll).toHaveBeenCalledTimes(3);
  });

  it('survives a poll that throws — one bad request is not a failed sign-in', async () => {
    // The flow lives for minutes; a dropped connection mid-way must not end it
    // while the code on screen is still valid.
    const poll = jest.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ auth: { token: 't' }, username: 'zack' });
    const codeAuth = makeCodeAuth({ poll });
    const { result } = await renderWithFakeTimers(() => useCodeAuth({ codeAuth, serverUrl }));

    await act(async () => { await result.current.start(); });
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(result.current.phase).toEqual({ status: 'waiting', code: 'ABC123' });

    await act(async () => { jest.advanceTimersByTime(1000); });
    await waitFor(() => expect(result.current.phase.status).toBe('approved'));
  });

  it('expires rather than polling a stale code forever', async () => {
    const codeAuth = makeCodeAuth({ timeoutMs: 5000 });
    const { result } = await renderWithFakeTimers(() => useCodeAuth({ codeAuth, serverUrl }));

    await act(async () => { await result.current.start(); });
    await act(async () => { jest.advanceTimersByTime(6000); });

    await waitFor(() => {
      expect(result.current.phase).toEqual({ status: 'failed', reason: 'expired' });
    });
  });

  it('distinguishes a failure to begin from an expiry', async () => {
    const codeAuth = makeCodeAuth({
      begin: jest.fn(async () => { throw new Error('Quick Connect is not enabled'); }),
    });
    const { result } = await renderWithFakeTimers(() => useCodeAuth({ codeAuth, serverUrl }));

    await act(async () => { await result.current.start(); });

    expect(result.current.phase).toEqual({
      status: 'failed',
      reason: 'error',
      message: 'Quick Connect is not enabled',
    });
  });

  it('stops polling when cancelled', async () => {
    const codeAuth = makeCodeAuth();
    const { result } = await renderWithFakeTimers(() => useCodeAuth({ codeAuth, serverUrl }));

    await act(async () => { await result.current.start(); });
    await act(async () => { result.current.cancel(); });

    expect(result.current.phase).toEqual({ status: 'idle' });

    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(codeAuth.poll).not.toHaveBeenCalled();
  });

  it('stops polling when the screen goes away', async () => {
    // The poll carries the server URL and any proxy credentials, so an
    // interval outliving the screen keeps hitting a server nobody is watching.
    const codeAuth = makeCodeAuth();
    const { result, unmount } = await renderWithFakeTimers(() => useCodeAuth({ codeAuth, serverUrl }));

    await act(async () => { await result.current.start(); });
    await act(async () => { unmount(); });

    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(codeAuth.poll).not.toHaveBeenCalled();
  });

  it('sends the proxy credentials as they are when the poll fires', async () => {
    // Basic auth is typed into the same form, so the value can change after
    // begin(); re-creating the interval on each keystroke would restart the
    // flow under the user instead.
    const codeAuth = makeCodeAuth();
    jest.useRealTimers();
    const { result, rerender } = await renderHook<
      ReturnType<typeof useCodeAuth>,
      { basicAuth?: BasicAuth }
    >(
      ({ basicAuth }) => useCodeAuth({ codeAuth, serverUrl, basicAuth }),
      { initialProps: { basicAuth: undefined } }
    );
    jest.useFakeTimers();

    await act(async () => { await result.current.start(); });
    await act(async () => { rerender({ basicAuth: { username: 'u', password: 'p' } }); });
    await act(async () => { jest.advanceTimersByTime(1000); });

    expect(codeAuth.poll).toHaveBeenLastCalledWith(
      expect.objectContaining({ basicAuth: { username: 'u', password: 'p' } })
    );
  });

  it('does nothing when the provider has no code flow', async () => {
    const { result } = await renderWithFakeTimers(() => useCodeAuth({ codeAuth: undefined, serverUrl }));

    await act(async () => { await result.current.start(); });

    expect(result.current.phase).toEqual({ status: 'idle' });
  });
});
