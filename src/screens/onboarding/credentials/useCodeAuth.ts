import { useCallback, useEffect, useRef, useState } from 'react';

import type { CodeAuthApi, ProviderAuth } from '@/utils/servers/registry';
import type { BasicAuth } from '@/types';

export type CodeAuthPhase =
  /** Not started — the password form is showing. */
  | { status: 'idle' }
  /** `begin()` is in flight; there is no code to show yet. */
  | { status: 'starting' }
  /** Showing `code` and polling for approval. */
  | { status: 'waiting'; code: string }
  /** The user approved; these are the credentials to save. */
  | { status: 'approved'; auth: ProviderAuth; username: string }
  /** Gave up. `reason` distinguishes a stale code from a real failure. */
  | { status: 'failed'; reason: 'expired' | 'error'; message?: string };

type Options = {
  codeAuth: CodeAuthApi | undefined;
  serverUrl: string;
  basicAuth?: BasicAuth;
};

/**
 * Drives a code-based sign-in: begin, poll until approved, expire on time.
 *
 * Extracted from the onboarding screen rather than left inline because the
 * interesting part is a state machine with a timer in it, and the house style
 * is to pull that kind of decision out where it can be tested. The screen is
 * then only responsible for rendering whichever phase it is handed.
 *
 * Two details are easy to get wrong and are handled here:
 *
 * - **A poll that throws is not a failure.** The network drops, a proxy
 *   hiccups, the server restarts mid-flow. Each poll is independently
 *   attempted and a thrown one is swallowed, because the next one two seconds
 *   later is likely to succeed and the code has not expired yet. Only the
 *   timeout ends a waiting flow.
 * - **The interval must not outlive the screen.** Polling holds the server URL
 *   and proxy credentials, and an interval that survives unmount keeps hitting
 *   a server for a flow nobody is watching.
 */
export function useCodeAuth({ codeAuth, serverUrl, basicAuth }: Options) {
  const [phase, setPhase] = useState<CodeAuthPhase>({ status: 'idle' });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  // The poll closure reads these, and re-creating the interval whenever a
  // proxy field changes would restart the flow under the user.
  const basicAuthRef = useRef(basicAuth);
  basicAuthRef.current = basicAuth;

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const cancel = useCallback(() => {
    stopPolling();
    setPhase({ status: 'idle' });
  }, [stopPolling]);

  const start = useCallback(async () => {
    if (!codeAuth || !serverUrl) return;

    stopPolling();
    setPhase({ status: 'starting' });

    let handle: unknown;
    try {
      const begun = await codeAuth.begin({ serverUrl, basicAuth: basicAuthRef.current });
      handle = begun.handle;
      setPhase({ status: 'waiting', code: begun.code });
    } catch (err: any) {
      setPhase({ status: 'failed', reason: 'error', message: err?.message });
      return;
    }

    startedAtRef.current = Date.now();

    intervalRef.current = setInterval(async () => {
      if (Date.now() - startedAtRef.current > codeAuth.timeoutMs) {
        stopPolling();
        setPhase({ status: 'failed', reason: 'expired' });
        return;
      }

      let result: Awaited<ReturnType<CodeAuthApi['poll']>>;
      try {
        result = await codeAuth.poll({
          serverUrl,
          handle,
          basicAuth: basicAuthRef.current,
        });
      } catch {
        // Transient — the code is still good, so keep waiting for the timeout
        // to be the thing that ends this rather than one unlucky request.
        return;
      }

      if (!result) return;

      stopPolling();
      setPhase({ status: 'approved', auth: result.auth, username: result.username });
    }, codeAuth.pollIntervalMs);
  }, [codeAuth, serverUrl, stopPolling]);

  return { phase, start, cancel };
}
