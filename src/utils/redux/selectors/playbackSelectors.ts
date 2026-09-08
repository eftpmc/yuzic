import { RootState } from '@/utils/redux/store';

export const selectPersistedPlayback = (s: RootState) => s.playback;
export const selectPersistedPlaybackQueue = (s: RootState) => s.playback.queueSongIds;
export const selectPersistedPlaybackCurrentIndex = (s: RootState) => s.playback.currentIndex;
export const selectPersistedPlaybackPositionMs = (s: RootState) => s.playback.positionMs;
export const selectPersistedPlaybackRepeatMode = (s: RootState) => s.playback.repeatMode;
export const selectPersistedPlaybackShuffleMode = (s: RootState) => s.playback.shuffleMode;
export const selectPersistedPlaybackActiveServerId = (s: RootState) => s.playback.activeServerId;
export const selectPersistedPlaybackBookmarks = (s: RootState) => s.playback.bookmarks;
