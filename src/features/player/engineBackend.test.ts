import {
  applyEvent,
  createShadow,
  toEngineTrack,
  toMediaItem,
  toRntpProgress,
} from './engineBackend';
import type { MediaItem } from './mediaItem';

const item = (over: Partial<MediaItem> = {}): MediaItem => ({
  mediaId: 'song-1',
  title: 'Lonely',
  artist: 'Someone',
  albumTitle: 'An Album',
  duration: 180,
  url: 'https://example/stream?id=1',
  artworkUrl: 'https://example/cover.jpg',
  ...over,
});

describe('the shadow the synchronous getters read from', () => {
  it('takes progress from the engine as it arrives', () => {
    const after = applyEvent(createShadow(), {
      type: 'progress',
      progress: { positionSec: 12, durationSec: 180, bufferedSec: 30 },
    });
    expect(after.progress.positionSec).toBe(12);
  });

  it('resets position on a track change rather than carrying it over', () => {
    const playing = applyEvent(createShadow(), {
      type: 'progress',
      progress: { positionSec: 178, durationSec: 180, bufferedSec: 180 },
    });
    const next = applyEvent(playing, { type: 'trackChange', index: 1, id: 'song-2' });

    // Carried over, the new track would show as starting at 2:58 until the
    // next progress event — a visible jump backwards on every track change.
    expect(next.progress.positionSec).toBe(0);
    expect(next.activeIndex).toBe(1);
  });

  it('takes the new duration from the queue so the bar is not zero-width', () => {
    const withQueue = { ...createShadow(), queue: [item(), item({ duration: 240 })] };
    const next = applyEvent(withQueue, { type: 'trackChange', index: 1, id: 'song-2' });
    expect(next.progress.durationSec).toBe(240);
  });

  it('tracks whether the engine considers itself playing', () => {
    const playing = applyEvent(createShadow(), { type: 'stateChange', state: 'playing' });
    expect(playing.playing).toBe(true);
    const paused = applyEvent(playing, { type: 'stateChange', state: 'paused' });
    expect(paused.playing).toBe(false);
    // Buffering is not playing, but it is not paused either — what matters is
    // that a play button does not flip to "paused" every time a track loads.
    const buffering = applyEvent(playing, { type: 'stateChange', state: 'buffering' });
    expect(buffering.playing).toBe(false);
  });

  it('ignores events that say nothing about position or queue', () => {
    const before = applyEvent(createShadow(), {
      type: 'progress',
      progress: { positionSec: 5, durationSec: 100, bufferedSec: 20 },
    });
    const after = applyEvent(before, { type: 'error', code: 'X', message: 'nope' });
    expect(after).toEqual(before);
  });
});

describe('translating between the app and the engine', () => {
  it('carries the fields the engine actually uses', () => {
    const track = toEngineTrack(item());
    expect(track).toMatchObject({
      id: 'song-1',
      uri: 'https://example/stream?id=1',
      title: 'Lonely',
      album: 'An Album',
      durationSec: 180,
    });
  });

  it('unwraps the object form buildTrackItem uses for local files', () => {
    const track = toEngineTrack(item({ url: { uri: 'file:///music/a.flac' } }));
    expect(track.uri).toBe('file:///music/a.flac');
  });

  it('leaves an unknown duration absent rather than zero', () => {
    // The engine clamps a crossfade against the shorter track and treats these
    // differently: absent means "not known yet", zero means "no length".
    expect(toEngineTrack(item({ duration: undefined })).durationSec).toBeUndefined();
  });

  it('falls back to the url when a track carries no id', () => {
    // The engine keys its disk cache on the id. Without a fallback every such
    // track would share one cache entry.
    const track = toEngineTrack(item({ mediaId: undefined }));
    expect(track.id).toBe('https://example/stream?id=1');
  });

  it('gives an empty album rather than a missing one on the way back', () => {
    const back = toMediaItem(toEngineTrack(item({ albumTitle: '' })));
    expect(back.albumTitle).toBe('');
  });

  it('survives a round trip with the fields the app reads', () => {
    const back = toMediaItem(toEngineTrack(item()));
    expect(back).toMatchObject({
      mediaId: 'song-1',
      title: 'Lonely',
      artist: 'Someone',
      duration: 180,
    });
  });
});

describe('progress, in the shape the app expects', () => {
  it('converts buffered from absolute to remaining runway', () => {
    // The engine reports buffered on the same timeline as position — 30 means
    // "buffered up to 0:30" — and a caller asking how much runway is left
    // wants the difference.
    const out = toRntpProgress({ positionSec: 12, durationSec: 180, bufferedSec: 30 });
    expect(out).toEqual({ position: 12, duration: 180, buffered: 18 });
  });

  it('never reports negative runway', () => {
    // Position can momentarily exceed the last buffered figure between events.
    const out = toRntpProgress({ positionSec: 40, durationSec: 180, bufferedSec: 30 });
    expect(out.buffered).toBe(0);
  });
});
