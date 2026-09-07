import { useEffect, useState } from 'react';
import { useApi } from '@/api';

/**
 * Whether this user may actually drive the server's jukebox.
 *
 * Presence of `api.jukebox` only says the adapter speaks the protocol. Two
 * gates sit behind it, and neither is visible from here:
 *
 * - Navidrome ships the jukebox **off** (`Jukebox.Enabled`, default false).
 *   A server with it disabled doesn't even answer in Subsonic's error shape —
 *   demo.navidrome.org replies with the bare text "This endpoint is not
 *   implemented, but may be in future releases".
 * - With it enabled, Subsonic still grants the jukebox per user and answers
 *   error 50 to everyone else.
 *
 * So the only honest test is to ask. One `status()` per sheet opening; any
 * failure — refusal, prose, a parse error on either — is a "no", because not
 * being able to use it is the ordinary case, not an exception worth surfacing.
 * Offering the row on presence alone would give most Navidrome users one that
 * errors when tapped: the Radio-row-that-goes-nowhere problem, one level in.
 */
export function useJukeboxAvailability(enabled: boolean): boolean {
  const api = useApi();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!enabled || !api.jukebox) {
      setAvailable(false);
      return;
    }
    let cancelled = false;
    api.jukebox.status()
      .then(() => { if (!cancelled) setAvailable(true); })
      .catch(() => { if (!cancelled) setAvailable(false); });
    return () => { cancelled = true; };
  }, [api, enabled]);

  return available;
}
