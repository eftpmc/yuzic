import type { Server } from '@/types';

/**
 * Multi-URL server failover for issue #115.
 *
 * A server can be reachable at more than one address — a LAN IP at home, a
 * Tailscale or domain URL on the road. `fallbackUrls` on the Server holds the
 * extras; primary + fallbacks are tried in order, and the last known-good URL
 * is cached per server so subsequent requests skip straight to it.
 *
 * This module is deliberately fetch-agnostic — it takes a "try one URL" async
 * probe and returns whichever URL that probe resolves against, so tests can
 * exercise the failover logic without any network mocking.
 */

const preferredByServer = new Map<string, string>();

export type ServerUrlHint = Pick<Server, 'id' | 'serverUrl' | 'fallbackUrls'>;

export function candidateUrls(server: ServerUrlHint): string[] {
  const primary = normalize(server.serverUrl);
  const fallbacks = (server.fallbackUrls ?? []).map(normalize).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of [primary, ...fallbacks]) {
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

/**
 * URLs to try for the next request, cached-preferred first. On cache miss or
 * a cached URL that isn't in the list any more, falls back to the natural
 * order returned by {@link candidateUrls}.
 */
export function orderedUrls(server: ServerUrlHint): string[] {
  const candidates = candidateUrls(server);
  if (candidates.length <= 1) return candidates;
  const preferred = preferredByServer.get(server.id);
  if (!preferred) return candidates;
  const idx = candidates.findIndex(u => u === preferred);
  if (idx <= 0) return candidates;
  const reordered = [candidates[idx]];
  for (let i = 0; i < candidates.length; i++) {
    if (i !== idx) reordered.push(candidates[i]);
  }
  return reordered;
}

export function rememberReachable(serverId: string, url: string): void {
  preferredByServer.set(serverId, normalize(url));
}

export function forgetReachable(serverId: string): void {
  preferredByServer.delete(serverId);
}

/** For tests. */
export function _resetCache(): void {
  preferredByServer.clear();
}

/**
 * Runs `attempt(url)` against each candidate URL in order until one resolves,
 * then caches that URL as preferred and returns its result. If every attempt
 * rejects with a {@link isNetworkError} error, throws the last error so the
 * caller sees the real failure rather than a wrapped one. Non-network errors
 * (HTTP 4xx/5xx surfaced by the caller as a thrown value) short-circuit and
 * are re-thrown without trying the next URL — the URL is reachable, the
 * request itself failed.
 */
export async function tryWithFailover<T>(
  server: ServerUrlHint,
  attempt: (url: string) => Promise<T>,
): Promise<T> {
  const urls = orderedUrls(server);
  if (urls.length === 0) {
    throw new Error('Server has no URL configured');
  }
  let lastError: unknown;
  for (const url of urls) {
    try {
      const result = await attempt(url);
      rememberReachable(server.id, url);
      return result;
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('All server URLs unreachable');
}

/**
 * True for the class of errors that mean "the URL didn't answer" — DNS
 * failures, connect refused, timeouts, TLS handshake errors. We identify these
 * by name/message rather than instanceof because they arrive as generic
 * `TypeError` or `AbortError` in React Native's fetch. HTTP status errors are
 * NOT network errors — those come back as ok:false or a caller-thrown Error
 * with the status code, and the caller has already reached this URL.
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  const e = error as { name?: string; message?: string };
  const name = e.name?.toLowerCase() ?? '';
  const message = e.message?.toLowerCase() ?? '';
  if (name === 'aborttimeouterror') return true;
  if (name === 'aborterror' && message.includes('timeout')) return true;
  if (name === 'typeerror' && (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('load failed')
  )) return true;
  if (message.includes('enotfound') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('etimedout') ||
      message.includes('ehostunreach') ||
      message.includes('enetunreach')) return true;
  return false;
}

function normalize(url: string | undefined | null): string {
  if (!url) return '';
  return url.trim().replace(/\/+$/, '');
}
