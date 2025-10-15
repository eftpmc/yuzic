import TrackPlayer, { Event } from 'react-native-track-player';

export const PlaybackService = async () => {
    TrackPlayer.addEventListener(Event.RemotePlay, async () => {
        await TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemotePause, async () => {
        await TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        try {
            await TrackPlayer.skipToNext();
        } catch (error) {
            console.warn('[RemoteNext] No next track:', error);
        }
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        try {
            await TrackPlayer.skipToPrevious();
        } catch (error) {
            console.warn('[RemotePrevious] No previous track:', error);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, async ({ position }) => {
        try {
            await TrackPlayer.seekTo(position);
        } catch (error) {
            console.error('[RemoteSeek] Failed to seek:', error);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteStop, async () => {
        try {
            await TrackPlayer.stop();
        } catch (error) {
            console.error('[RemoteStop] Failed to stop playback:', error);
        }
    });
};