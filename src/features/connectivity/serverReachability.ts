import { useSyncExternalStore } from 'react';

// Tracks whether the active music server is reachable — a separate signal
// from NetInfo's device connectivity. The case that needs this: the phone is
// online but the server isn't reachable (VPN like Tailscale down, server
// rebooting, DNS change). NetInfo reports online, so none of the offline
// handling engages, and every query independently times out.
//
// Lives outside React so the module-scope QueryCache error handler in
// app/_layout can report failures without any provider plumbing. The
// ServerReachabilityWatcher component owns confirmation and recovery: when
// this flips to unreachable it pings the server, clearing the flag on the
// first success — so a one-off failed request self-corrects within one ping.

let serverUnreachable = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(listener => listener());
}

export function setServerUnreachable(value: boolean) {
  if (serverUnreachable === value) return;
  serverUnreachable = value;
  emit();
}

export function getServerUnreachable(): boolean {
  return serverUnreachable;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useServerUnreachable(): boolean {
  return useSyncExternalStore(subscribe, getServerUnreachable, getServerUnreachable);
}

// Fetch-level failures (host unreachable, connection refused, aborted by our
// timeout) — as opposed to HTTP errors, which mean the server responded.
export function isLikelyNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError') return true;
  return /network request failed|failed to fetch|could not connect|timeout/i.test(error.message);
}
