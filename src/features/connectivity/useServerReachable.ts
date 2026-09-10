import { useIsOffline } from '@/hooks/useIsOffline';
import { useServerUnreachable } from './serverReachability';

/**
 * Whether the active music server can be asked for anything right now.
 *
 * Two conditions, both of which mean "don't issue the request", for different
 * reasons: the device has no network at all, or the device is online while the
 * server isn't (VPN down, server rebooting, DNS moved). The second is the one
 * worth having a signal for — NetInfo reports online, so nothing else engages,
 * and each request instead hangs until its own timeout.
 *
 * `useOfflineFirstQuery` folds this in already for the resources that have a
 * synced fallback. This hook is for the ones that have none — radio, podcasts,
 * shares — where the honest answer offline is an empty state saying so, rather
 * than a spinner that resolves into a load failure.
 */
export function useServerReachable(): boolean {
  const isOffline = useIsOffline();
  const serverUnreachable = useServerUnreachable();
  return !isOffline && !serverUnreachable;
}
