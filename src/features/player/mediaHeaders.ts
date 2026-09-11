import type { Server, Song } from '@/types';
import { plexBasicAuthHeader } from '@/api/plex/client';

/**
 * The ephemeral request headers a track needs to be fetched, kept off the URL
 * and off any persisted Song/queue/cache. Audio and artwork are separate
 * fields because the engine fetches cover art independently of the stream and
 * wires each to a distinct `Track` field — see `mediaItem.ts` and the engine's
 * `Track.headers` / `Track.artworkHeaders`.
 */
export interface RequestHeaders {
  headers?: Record<string, string>;
  artworkHeaders?: Record<string, string>;
}

const EMPTY: RequestHeaders = {};

/**
 * Headers for one song against the active server.
 *
 * Only a Plex server with Basic auth configured returns anything: those sit
 * behind a reverse proxy that authenticates every request — the stream and the
 * artwork alike — with `Authorization: Basic`, and a signed-URL/token provider
 * (Navidrome, Jellyfin, Emby, a token-only Plex) must be left untouched. The
 * same header value covers both fetches, but is handed back under the two
 * distinct fields so the engine wires them independently.
 *
 * A song already resolved to a local `file://` path needs no credentials, so
 * it is skipped even on a Basic-auth Plex server. A song that names a different
 * provider than the active server (a mixed queue) is likewise skipped — its
 * credentials are not the ones we hold.
 */
export function mediaHeadersForSong(
  server: Server | null | undefined,
  song: Pick<Song, 'sourceServerType' | 'streamUrl'>
): RequestHeaders {
  if (song.streamUrl?.startsWith('file:')) return EMPTY;
  const kind = song.sourceServerType ?? server?.type;
  if (kind !== 'plex') return EMPTY;
  const auth = plexBasicAuthHeader(server?.basicAuth);
  if (!auth) return EMPTY;
  return { headers: auth, artworkHeaders: auth };
}
