import type { Song } from '@/types';
import {
  FILL_BATCH_SIZE,
  LOW_WATERMARK,
  RECENT_CONTEXT_SIZE,
  buildFillRequest,
  remainingAfterCurrent,
  shouldFillQueue,
} from './autoplayFill';

function queue(size: number): Song[] {
  return Array.from({ length: size }, (_, i) => ({ id: `track-${i}` }) as Song);
}

const enabled = { autoplayEnabled: true, isFilling: false };

describe('remainingAfterCurrent', () => {
  it('counts the tracks left after the current one', () => {
    expect(remainingAfterCurrent(10, 0)).toBe(9);
    expect(remainingAfterCurrent(10, 9)).toBe(0);
  });

  it('never goes negative on an index past the end', () => {
    // A stale index must not read as "plenty of runway left".
    expect(remainingAfterCurrent(3, 7)).toBe(0);
  });

  it('reports nothing left for an empty queue', () => {
    expect(remainingAfterCurrent(0, 0)).toBe(0);
  });
});

describe('shouldFillQueue', () => {
  it('fills once runway reaches the watermark', () => {
    expect(shouldFillQueue({ queueLength: 10, currentIndex: 6, ...enabled })).toBe(true);
  });

  it('holds off while there is more runway than the watermark', () => {
    expect(shouldFillQueue({ queueLength: 10, currentIndex: 5, ...enabled })).toBe(false);
  });

  it('fills at the end of the queue', () => {
    expect(shouldFillQueue({ queueLength: 10, currentIndex: 9, ...enabled })).toBe(true);
  });

  it('does nothing when autoplay is off', () => {
    expect(
      shouldFillQueue({ queueLength: 10, currentIndex: 9, autoplayEnabled: false, isFilling: false })
    ).toBe(false);
  });

  it('does not start a second fill while one is in flight', () => {
    // A concurrent fill would append the same batch twice.
    expect(
      shouldFillQueue({ queueLength: 10, currentIndex: 9, autoplayEnabled: true, isFilling: true })
    ).toBe(false);
  });

  it('fills on a stale index past the end rather than stalling', () => {
    expect(shouldFillQueue({ queueLength: 3, currentIndex: 7, ...enabled })).toBe(true);
  });

  it('sits exactly on the documented watermark', () => {
    const atWatermark = { queueLength: 10, currentIndex: 10 - 1 - LOW_WATERMARK, ...enabled };
    const justAbove = { queueLength: 10, currentIndex: 10 - 2 - LOW_WATERMARK, ...enabled };

    expect(shouldFillQueue(atWatermark)).toBe(true);
    expect(shouldFillQueue(justAbove)).toBe(false);
  });
});

describe('buildFillRequest', () => {
  it('sends the current track and the recent ones as context', () => {
    const request = buildFillRequest(queue(20), 10);

    expect(request.recentSongs.map(song => song.id)).toEqual([
      'track-5', 'track-6', 'track-7', 'track-8', 'track-9', 'track-10',
    ]);
  });

  it('includes the current track in the context', () => {
    const request = buildFillRequest(queue(20), 10);

    expect(request.recentSongs[request.recentSongs.length - 1].id).toBe('track-10');
  });

  it('caps the context window', () => {
    expect(buildFillRequest(queue(50), 40).recentSongs).toHaveLength(RECENT_CONTEXT_SIZE + 1);
  });

  it('does not run off the start of the queue', () => {
    const request = buildFillRequest(queue(20), 2);

    expect(request.recentSongs.map(song => song.id)).toEqual([
      'track-0', 'track-1', 'track-2',
    ]);
  });

  it('excludes everything already queued so a fill cannot duplicate it', () => {
    const request = buildFillRequest(queue(4), 1);

    expect([...request.excludeIds].sort()).toEqual([
      'track-0', 'track-1', 'track-2', 'track-3',
    ]);
  });

  it('excludes tracks ahead of the current one, not just played ones', () => {
    // The queue's tail is what a fill would otherwise re-add.
    expect(buildFillRequest(queue(10), 0).excludeIds.has('track-9')).toBe(true);
  });

  it('requests the default batch size', () => {
    expect(buildFillRequest(queue(10), 0).count).toBe(FILL_BATCH_SIZE);
  });

  it('honours an explicit batch size', () => {
    expect(buildFillRequest(queue(10), 0, 3).count).toBe(3);
  });

  it('handles an empty queue without throwing', () => {
    const request = buildFillRequest([], 0);

    expect(request.recentSongs).toEqual([]);
    expect(request.excludeIds.size).toBe(0);
  });
});
