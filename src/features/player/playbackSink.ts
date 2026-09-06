/**
 * Where the audio comes out.
 *
 * Three answers today, and the difference that matters is not the protocol but
 * who is holding the audio and the clock:
 *
 * - `local` — this device. TrackPlayer plays, TrackPlayer keeps the time.
 * - `dlna` — a renderer on the network. TrackPlayer *still* plays and still
 *   keeps the time; it is muted (`setVolume(0)`) and the same stream URL is
 *   handed to the renderer, because a DLNA device reports no position back.
 *   Transport commands are therefore **mirrored**: both sides get them.
 * - `jukebox` — the music server itself. The server holds the audio and
 *   reports its own position, so the local player is not involved at all.
 *   Transport commands are **replaced**, not mirrored, and nothing streams to
 *   the phone — which is the point of asking the server to play.
 *
 * `ownsPlayback` is that distinction, and it is the one every caller needs:
 * a mirroring sink still wants the local calls made, a replacing sink must not
 * have them made at all.
 */

export type PlaybackSink =
  | { kind: 'local' }
  | { kind: 'dlna'; id: string; name: string }
  | { kind: 'jukebox'; name: string };

export const LOCAL_SINK: PlaybackSink = { kind: 'local' };

/** True when the sink, not this device, is holding the audio and the clock. */
export function ownsPlayback(sink: PlaybackSink): boolean {
  return sink.kind === 'jukebox';
}

/** True when the local player still runs (audibly or muted) alongside the sink. */
export function playsLocally(sink: PlaybackSink): boolean {
  return !ownsPlayback(sink);
}

/** Identity for render keys and "is this the selected row" checks. */
export function sinkId(sink: PlaybackSink): string {
  switch (sink.kind) {
    case 'local': return 'local';
    case 'dlna': return `dlna:${sink.id}`;
    case 'jukebox': return 'jukebox';
  }
}

export function isSameSink(a: PlaybackSink, b: PlaybackSink): boolean {
  return sinkId(a) === sinkId(b);
}
