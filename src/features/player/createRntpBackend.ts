import TrackPlayer, { Event, PlaybackState, PlayerCommand, RepeatMode } from '@rntp/player';
import type { PlayerBackend, BackendEvent } from './backend';

/**
 * `PlayerBackend` over `@rntp/player`, which is what the app does today.
 *
 * Deliberately a dull file. Its job is to make the current behaviour reachable
 * through the same interface as the engine, so that switching between them is
 * a choice rather than a rewrite — and so that if the engine misbehaves on a
 * device, the comparison is one toggle away rather than a rebuild.
 *
 * Nothing here is new logic. Anything that looks like a decision was already
 * being made at the call site it came from, and moving it should not change
 * what the app does.
 */
export function createRntpBackend(): PlayerBackend {
  return {
    setup() {
      TrackPlayer.setupPlayer({
        contentType: 'music',
        handleAudioBecomingNoisy: true,
        cache: {
          maxSizeBytes: 1024 * 1024 * 1024,
          preloading: { window: 2 },
        },
        android: {
          wakeMode: 'network',
          notification: {
            channelId: 'yuzic-playback',
            channelName: 'Playback',
            smallIcon: 'ic_launcher',
          },
        },
      });
    },

    setCommands() {
      TrackPlayer.setCommands({
        capabilities: [
          PlayerCommand.PlayPause,
          PlayerCommand.Next,
          PlayerCommand.Previous,
          PlayerCommand.Seek,
          PlayerCommand.Stop,
          PlayerCommand.SkipForward,
          PlayerCommand.SkipBackward,
        ],
        handling: 'native',
      });
    },

    setMediaItems(items, startIndex = 0) { TrackPlayer.setMediaItems(items, startIndex); },
    addMediaItems(items) { TrackPlayer.addMediaItems(items); },
    insertMediaItem(index, item) { TrackPlayer.insertMediaItem(index, item); },
    removeMediaItem(index) { TrackPlayer.removeMediaItem(index); },
    moveMediaItem(from, to) { TrackPlayer.moveMediaItem(from, to); },
    clear() { TrackPlayer.clear(); },

    play() { TrackPlayer.play(); },
    pause() { TrackPlayer.pause(); },
    stop() { TrackPlayer.stop(); },
    seekTo(positionSeconds) { TrackPlayer.seekTo(positionSeconds); },
    skipToNext() { TrackPlayer.skipToNext(); },
    skipToIndex(index) { TrackPlayer.skipToIndex(index); },
    setVolume(volume) { TrackPlayer.setVolume(volume); },
    setPlaybackSpeed(speed) { TrackPlayer.setPlaybackSpeed(speed); },

    setRepeatMode(mode) {
      TrackPlayer.setRepeatMode(
        mode === 'queue' ? RepeatMode.All : mode === 'track' ? RepeatMode.One : RepeatMode.Off
      );
    },

    getProgress() { return TrackPlayer.getProgress(); },
    getQueue() { return TrackPlayer.getQueue(); },
    getActiveMediaItemIndex() { return TrackPlayer.getActiveMediaItemIndex(); },
    getActiveMediaItem() { return TrackPlayer.getActiveMediaItem(); },

    sleepAfterTime(seconds, options) {
      TrackPlayer.sleepAfterTime(seconds, { fadeOutSeconds: options?.fadeOutSeconds });
    },
    cancelSleepTimer() { TrackPlayer.cancelSleepTimer(); },

    clearCache() { TrackPlayer.clearCache(); },

    /**
     * Three rntp subscriptions folded into the one the interface promises.
     *
     * The unsubscribe returned here removes all three: a caller that took one
     * listener should not have to remember that it was really three, and
     * leaving any of them attached is a listener firing into a component that
     * has gone.
     */
    addListener(listener: (event: BackendEvent) => void) {
      const subscriptions = [
        TrackPlayer.addEventListener(Event.PlaybackError, event =>
          listener({ type: 'error', code: event.code, message: event.message ?? 'playback failed' })
        ),
        TrackPlayer.addEventListener(Event.PlaybackStateChanged, ({ state }) =>
          listener({ type: 'stateChange', buffering: state === PlaybackState.Buffering })
        ),
        TrackPlayer.addEventListener(Event.MediaItemTransition, () =>
          listener({ type: 'trackChange', index: TrackPlayer.getActiveMediaItemIndex() ?? 0 })
        ),
      ];
      return () => {
        for (const subscription of subscriptions) subscription.remove();
      };
    },
  };
}
