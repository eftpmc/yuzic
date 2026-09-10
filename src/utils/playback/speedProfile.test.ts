import type { Song } from '@/types';
import {
  clampSpeed,
  MAX_SPEED,
  MIN_SPEED,
  speedFor,
  speedProfileFor,
} from './speedProfile';

const song = { id: 's', title: 'A Song' } as Song;
const episode = { id: 'podcast:e', title: 'An Episode', contentKind: 'podcastEpisode' } as Song;
const stream = { id: 'radio:r', title: 'A Station', contentKind: 'liveStream' } as Song;

describe('speedProfileFor', () => {
  it('treats a podcast episode as spoken word', () => {
    expect(speedProfileFor(episode)).toBe('spoken');
  });

  it('treats everything else as music', () => {
    expect(speedProfileFor(song)).toBe('music');
    expect(speedProfileFor(stream)).toBe('music');
    expect(speedProfileFor(null)).toBe('music');
  });
});

describe('speedFor', () => {
  it('keeps the two profiles apart, which is the whole point', () => {
    // Setting 1.5x for a podcast used to follow you into the next song.
    const speeds = { music: 1.0, spoken: 1.5 };
    expect(speedFor(episode, speeds)).toBe(1.5);
    expect(speedFor(song, speeds)).toBe(1.0);
  });

  it('falls back for a user who upgraded before this setting existed', () => {
    // undefined reaching the engine is a rate of NaN — silence with no error,
    // which is the worst way for a missing setting to present.
    expect(speedFor(episode, undefined)).toBe(1.0);
    expect(speedFor(episode, {})).toBe(1.0);
    expect(speedFor(song, { spoken: 2.0 })).toBe(1.0);
  });

  it('clamps a stored value that is out of range', () => {
    expect(speedFor(episode, { spoken: 99 })).toBe(MAX_SPEED);
    expect(speedFor(episode, { spoken: 0.01 })).toBe(MIN_SPEED);
  });

  it('survives a corrupted stored value rather than muting playback', () => {
    expect(speedFor(episode, { spoken: NaN })).toBe(1.0);
    expect(speedFor(episode, { spoken: Infinity })).toBe(1.0);
  });
});

describe('clampSpeed', () => {
  it('holds the useful listening range', () => {
    expect(clampSpeed(1.5)).toBe(1.5);
    expect(clampSpeed(5)).toBe(MAX_SPEED);
    expect(clampSpeed(0)).toBe(MIN_SPEED);
  });

  it('answers 1x for a number that is not one', () => {
    expect(clampSpeed(NaN)).toBe(1.0);
  });
});
