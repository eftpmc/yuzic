import type { Song } from '@/types';
import {
  needsSnapshot,
  songFromBookmarkSnapshot,
  toBookmarkSnapshot,
} from './bookmarkSnapshot';

const librarySong: Song = {
  id: 'track-1',
  title: 'A Long Song',
  artist: 'An Artist',
  artistId: 'artist-1',
  albumId: 'album-1',
  cover: { kind: 'navidrome', coverArtId: 'art-1' },
  duration: '2400',
  streamUrl: 'https://music.example/rest/stream.view?id=track-1&t=SECRET&s=SALT',
};

const podcastSong: Song = {
  ...librarySong,
  id: 'podcast:ep-9',
  streamId: 'stream-77',
  title: 'Episode 9',
  artist: 'A Show',
  albumId: 'channel-3',
  contentKind: 'podcastEpisode',
};

describe('needsSnapshot', () => {
  it('does not snapshot a library track, which the library can still describe', () => {
    expect(needsSnapshot(librarySong)).toBe(false);
  });

  it('snapshots a podcast episode, which the library never holds', () => {
    expect(needsSnapshot(podcastSong)).toBe(true);
  });

  it('recognises a podcast by its id namespace even with the kind missing', () => {
    // A Song rebuilt from an older snapshot may arrive without contentKind.
    // The namespace is what actually decides whether the library join can
    // succeed, so it is what this asks.
    const { contentKind: _dropped, ...withoutKind } = podcastSong;
    expect(needsSnapshot(withoutKind as Song)).toBe(true);
  });
});

describe('toBookmarkSnapshot', () => {
  it('never carries the stream URL, which is signed with the user token', () => {
    // The slice is persisted, so a stored URL would put credentials on disk
    // and pin them to whatever they were when the bookmark was written.
    const snapshot = toBookmarkSnapshot(podcastSong);
    expect(JSON.stringify(snapshot)).not.toContain('SECRET');
    expect(JSON.stringify(snapshot)).not.toContain('stream.view');
    expect('streamUrl' in snapshot).toBe(false);
  });

  it('keeps the stream id, which is what rebuilds the URL later', () => {
    // Not the episode id: a podcast episode only gains a playable stream id
    // once the server has downloaded it, and they are different values.
    expect(toBookmarkSnapshot(podcastSong).streamId).toBe('stream-77');
  });

  it('keeps what a row needs to draw itself', () => {
    const snapshot = toBookmarkSnapshot(podcastSong);
    expect(snapshot.title).toBe('Episode 9');
    expect(snapshot.artist).toBe('A Show');
    expect(snapshot.cover).toEqual({ kind: 'navidrome', coverArtId: 'art-1' });
    expect(snapshot.duration).toBe('2400');
    expect(snapshot.channelId).toBe('channel-3');
  });
});

describe('songFromBookmarkSnapshot', () => {
  it('round-trips into something playable', () => {
    const snapshot = toBookmarkSnapshot(podcastSong);
    const rebuilt = songFromBookmarkSnapshot('podcast:ep-9', snapshot, 'https://fresh/url');

    expect(rebuilt.id).toBe('podcast:ep-9');
    expect(rebuilt.title).toBe('Episode 9');
    expect(rebuilt.streamUrl).toBe('https://fresh/url');
    expect(rebuilt.contentKind).toBe('podcastEpisode');
  });

  it('falls back to a letter cover rather than rendering a hole', () => {
    const rebuilt = songFromBookmarkSnapshot(
      'podcast:ep-1',
      { title: 'No Art', artist: 'A Show' },
      'https://fresh/url',
    );
    expect(rebuilt.cover).toEqual({ kind: 'none' });
  });

  it('survives a snapshot written before duration was stored', () => {
    // Persisted state outlives the shape that wrote it; a missing duration
    // must not reach a progress bar as NaN.
    const rebuilt = songFromBookmarkSnapshot(
      'podcast:ep-2',
      { title: 'Old', artist: 'A Show' },
      'https://fresh/url',
    );
    expect(rebuilt.duration).toBe('0');
    expect(Number(rebuilt.duration)).not.toBeNaN();
  });
});
