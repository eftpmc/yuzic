import {
  LOCAL_SINK,
  isSameSink,
  ownsPlayback,
  playsLocally,
  sinkId,
  type PlaybackSink,
} from './playbackSink';

const dlna: PlaybackSink = { kind: 'dlna', id: 'uuid-1', name: 'Living Room' };
const jukebox: PlaybackSink = { kind: 'jukebox', name: 'Navidrome' };

/**
 * The one distinction the rest of the player depends on: whether the local
 * player is still running. Get this wrong for the jukebox and the phone plays
 * the track a second time, out loud, next to the server that is already
 * playing it.
 */
describe('playback sinks', () => {
  it('keeps the local player running for local and DLNA', () => {
    expect(playsLocally(LOCAL_SINK)).toBe(true);
    // Muted, as the clock and the queue driver — a DLNA renderer reports no
    // position of its own.
    expect(playsLocally(dlna)).toBe(true);
  });

  it('hands playback over entirely for the jukebox', () => {
    expect(ownsPlayback(jukebox)).toBe(true);
    expect(playsLocally(jukebox)).toBe(false);
  });

  it('does not treat casting as handing playback over', () => {
    expect(ownsPlayback(LOCAL_SINK)).toBe(false);
    expect(ownsPlayback(dlna)).toBe(false);
  });

  it('identifies a DLNA renderer by device, so two of them are different sinks', () => {
    const other: PlaybackSink = { kind: 'dlna', id: 'uuid-2', name: 'Kitchen' };
    expect(isSameSink(dlna, other)).toBe(false);
    expect(isSameSink(dlna, { ...dlna, name: 'Renamed' })).toBe(true);
  });

  it('gives every sink a stable id', () => {
    expect(sinkId(LOCAL_SINK)).toBe('local');
    expect(sinkId(dlna)).toBe('dlna:uuid-1');
    expect(sinkId(jukebox)).toBe('jukebox');
  });
});
