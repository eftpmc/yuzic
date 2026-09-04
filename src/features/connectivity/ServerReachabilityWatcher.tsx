import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useApi } from '@/api';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { usePollWhile } from '@/hooks/usePollWhile';
import { setServerUnreachable, useServerUnreachable } from './serverReachability';

const PING_TIMEOUT_MS = 5_000;
const RECHECK_INTERVAL_MS = 10_000;

function withTimeout(promise: Promise<boolean>, timeoutMs: number): Promise<boolean> {
  return Promise.race([
    promise,
    new Promise<boolean>(resolve => setTimeout(() => resolve(false), timeoutMs)),
  ]);
}

// Confirms and recovers the server-unreachable flag. Something (typically the
// QueryCache error handler) sets the flag on a network-level failure; this
// watcher then pings the server — immediately, then every RECHECK_INTERVAL_MS,
// and on app foreground / connectivity changes — and clears the flag on the
// first successful ping, invalidating queries so stale screens refetch.
// react-query's refetchOnReconnect can't do this: a VPN coming back up never
// changes NetInfo state.
export function ServerReachabilityWatcher() {
  const api = useApi();
  const queryClient = useQueryClient();
  const activeServer = useSelector(selectActiveServer);
  const unreachable = useServerUnreachable();
  const netInfo = useNetInfo();
  const tick = usePollWhile(unreachable, RECHECK_INTERVAL_MS);

  const serverId = activeServer?.id ?? null;
  const deviceOnline = netInfo.isConnected !== false;

  useEffect(() => {
    if (!unreachable || !serverId || !deviceOnline) return;
    let cancelled = false;

    withTimeout(
      api.auth.ping().catch(() => false),
      PING_TIMEOUT_MS
    ).then(ok => {
      if (cancelled || !ok) return;
      setServerUnreachable(false);
      queryClient.invalidateQueries();
    });

    return () => {
      cancelled = true;
    };
    // `tick` re-runs the ping while unreachable; deviceOnline re-runs it when
    // connectivity returns.
  }, [unreachable, tick, deviceOnline, serverId, api, queryClient]);

  // A server switch resets the verdict — the new server hasn't failed yet.
  useEffect(() => {
    setServerUnreachable(false);
  }, [serverId]);

  // Re-check on foreground so a recovery that happened while backgrounded
  // (VPN reconnected) is noticed immediately rather than on the next tick.
  useEffect(() => {
    if (!unreachable) return;
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      withTimeout(api.auth.ping().catch(() => false), PING_TIMEOUT_MS).then(ok => {
        if (!ok) return;
        setServerUnreachable(false);
        queryClient.invalidateQueries();
      });
    });
    return () => sub.remove();
  }, [unreachable, api, queryClient]);

  return null;
}
