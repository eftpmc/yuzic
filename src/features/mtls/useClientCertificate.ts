import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/utils/redux/store';
import { applyClientCertificate, type ApplyResult } from './applyClientCertificate';

/**
 * Deferred exactly as `createEngineBackend` defers it, and for the same
 * reason: requiring the native module at import time pulls it in during the
 * first render pass, before the module is registered.
 */
function engine() {
  return (require('yuzic-engine') as typeof import('yuzic-engine')).YuzicEngine;
}

/**
 * Keeps the engine's client certificate in step with the active server.
 *
 * Mounted once, near the root. The engine holds whatever it was last given
 * until told otherwise, so this has to run on every change of server and not
 * only when a certificate exists — switching to a server without one must
 * clear it, or requests present an identity issued for somewhere else.
 *
 * Returns the last result so a settings screen can say what happened, and a
 * `reapply` for the screen that has just imported or removed one.
 */
export function useClientCertificate() {
  const activeServerId = useSelector((state: RootState) => state.servers.activeServerId);
  const [result, setResult] = useState<ApplyResult | null>(null);

  const reapply = useCallback(async () => {
    const next = await applyClientCertificate(engine(), activeServerId);
    setResult(next);
    return next;
  }, [activeServerId]);

  useEffect(() => {
    let cancelled = false;
    applyClientCertificate(engine(), activeServerId).then(next => {
      // A server switched again while this was in flight: the later call owns
      // the answer, and letting this one land would report the wrong server's.
      if (!cancelled) setResult(next);
    });
    return () => {
      cancelled = true;
    };
  }, [activeServerId]);

  return { result, reapply };
}
