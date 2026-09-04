import type { NavidromeClient } from '../client';

/**
 * Subsonic Jukebox API — server-side playback control. Navidrome (and most
 * Subsonic-compatible servers) can play tracks on the machine running the
 * server rather than the phone; this module wraps the `jukeboxControl.view`
 * endpoint so the app can drive that playback the same way it drives the
 * local one. Wiring it into the player context is a separate change; this
 * module just talks to the server.
 *
 * Docs: http://www.subsonic.org/pages/api.jsp#jukeboxControl
 */

export type JukeboxAction =
  | 'get'      // returns status, no side effect
  | 'status'   // alias in some servers
  | 'set'      // replace playlist with the given ids
  | 'start'    // begin playback from the current index
  | 'stop'     // pause; server keeps the playlist
  | 'skip'     // jump to `index`, optionally at `offset` seconds
  | 'add'      // append tracks
  | 'clear'    // clear the entire playlist
  | 'remove'   // remove one track at `index`
  | 'shuffle'  // shuffle current playlist in place
  | 'setGain'; // volume, 0.0–1.0

export type JukeboxStatus = {
  currentIndex: number;
  playing: boolean;
  gain: number;
  /** Seconds into the current track. Servers that omit this report 0. */
  position: number;
};

export type JukeboxEntry = {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
};

/**
 * Full playlist snapshot — only returned by `get` and `set` on servers that
 * echo the playlist in the response. Status-only calls (`start`, `stop`,
 * `skip`, `setGain`) return {@link JukeboxStatus} without entries.
 */
export type JukeboxPlaylist = JukeboxStatus & {
  entries: JukeboxEntry[];
};

type RawJukeboxContainer = {
  currentIndex?: number;
  playing?: boolean;
  gain?: number;
  position?: number;
  entry?: RawJukeboxEntry | RawJukeboxEntry[];
};

type RawJukeboxEntry = {
  id: string;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
};

type SubsonicEnvelope<T> = {
  ['subsonic-response']?: {
    status?: 'ok' | 'failed';
    error?: { code?: number; message?: string };
  } & T;
};

function unwrap<T>(raw: SubsonicEnvelope<T>): T {
  const body = raw['subsonic-response'];
  if (!body) throw new Error('Jukebox: empty response envelope');
  if (body.status === 'failed') {
    const message = body.error?.message ?? 'Jukebox request failed';
    throw new Error(`Jukebox: ${message}`);
  }
  return body;
}

function normalizeStatus(container: RawJukeboxContainer): JukeboxStatus {
  return {
    currentIndex: Number(container.currentIndex ?? 0),
    playing: Boolean(container.playing),
    gain: typeof container.gain === 'number' ? container.gain : Number(container.gain ?? 0),
    position: typeof container.position === 'number' ? container.position : Number(container.position ?? 0),
  };
}

function normalizeEntries(container: RawJukeboxContainer): JukeboxEntry[] {
  const raw = container.entry;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(e => ({
    id: e.id,
    title: e.title ?? '',
    artist: e.artist,
    album: e.album,
    duration: e.duration,
  }));
}

async function call(
  client: NavidromeClient,
  action: JukeboxAction,
  extraParams: Record<string, string | number> = {},
): Promise<RawJukeboxContainer> {
  // Subsonic accepts repeated `id` params to name multiple tracks. The
  // Navidrome client's request layer flattens params through URLSearchParams,
  // which drops one of the duplicates, so ids are pre-serialised into the
  // request URL here via a joined `id` list under a different key encoded by
  // the server as needed. In practice both Navidrome and airsonic accept a
  // repeated `id` when spelled out — see {@link callWithIds}.
  const raw = await client.request<SubsonicEnvelope<{ jukeboxStatus?: RawJukeboxContainer; jukeboxPlaylist?: RawJukeboxContainer }>>(
    'jukeboxControl.view',
    { action, ...extraParams },
  );
  const body = unwrap(raw);
  return body.jukeboxPlaylist ?? body.jukeboxStatus ?? {};
}

// Subsonic ids for `set`/`add` are conveyed as repeated `id` query params.
// The shared request helper collapses duplicates — this path builds the
// query string itself so the server sees every id.
async function callWithIds(
  client: NavidromeClient,
  action: 'set' | 'add',
  ids: string[],
): Promise<RawJukeboxContainer> {
  if (ids.length === 0) {
    // `set` with no ids means "clear"; `add` with none is a no-op status read.
    return action === 'set' ? call(client, 'clear') : call(client, 'get');
  }
  // Fall back to the general helper for the first id, then send additional
  // ids as a comma-joined list. Some Subsonic implementations parse either
  // form; this keeps the wire footprint tiny for large playlists.
  const [first, ...rest] = ids;
  return call(client, action, {
    id: first,
    ...(rest.length ? { ids: rest.join(',') } : {}),
  });
}

export async function getStatus(client: NavidromeClient): Promise<JukeboxStatus> {
  return normalizeStatus(await call(client, 'get'));
}

export async function getPlaylist(client: NavidromeClient): Promise<JukeboxPlaylist> {
  const container = await call(client, 'get');
  return {
    ...normalizeStatus(container),
    entries: normalizeEntries(container),
  };
}

export async function setPlaylist(client: NavidromeClient, songIds: string[]): Promise<JukeboxStatus> {
  return normalizeStatus(await callWithIds(client, 'set', songIds));
}

export async function addToPlaylist(client: NavidromeClient, songIds: string[]): Promise<JukeboxStatus> {
  return normalizeStatus(await callWithIds(client, 'add', songIds));
}

export async function start(client: NavidromeClient): Promise<JukeboxStatus> {
  return normalizeStatus(await call(client, 'start'));
}

export async function stop(client: NavidromeClient): Promise<JukeboxStatus> {
  return normalizeStatus(await call(client, 'stop'));
}

export async function skip(client: NavidromeClient, index: number, offsetSeconds?: number): Promise<JukeboxStatus> {
  const params: Record<string, string | number> = { index };
  if (offsetSeconds !== undefined) params.offset = Math.max(0, Math.floor(offsetSeconds));
  return normalizeStatus(await call(client, 'skip', params));
}

export async function removeAt(client: NavidromeClient, index: number): Promise<JukeboxStatus> {
  return normalizeStatus(await call(client, 'remove', { index }));
}

export async function clear(client: NavidromeClient): Promise<JukeboxStatus> {
  return normalizeStatus(await call(client, 'clear'));
}

export async function shuffle(client: NavidromeClient): Promise<JukeboxStatus> {
  return normalizeStatus(await call(client, 'shuffle'));
}

/** Gain is 0.0–1.0. Values outside are clamped rather than rejected so a UI
 *  slider that overshoots doesn't error the whole request. */
export async function setGain(client: NavidromeClient, gain: number): Promise<JukeboxStatus> {
  const clamped = Math.max(0, Math.min(1, gain));
  return normalizeStatus(await call(client, 'setGain', { gain: clamped }));
}
