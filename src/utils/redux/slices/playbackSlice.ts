import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { RepeatModeState, ShuffleMode } from '@/contexts/PlayingContext';

/**
 * The app's own memory of what it was playing — queue, current position,
 * modes, and per-track resume positions for long-form content.
 *
 * This is the source of truth. `useQueueSync` and `useBookmarkManager`
 * mirror pieces of it to a Subsonic server when one supports the endpoints,
 * but the app's ability to remember what you were doing does NOT depend on
 * the server. Kill and reopen on Jellyfin, on Emby, on a Navidrome with
 * queue-sync off — the app resumes.
 *
 * `activeServerId` is stamped alongside the state so a server switch
 * invalidates the whole slice: song ids belong to one server, and loading a
 * Navidrome queue against a Jellyfin adapter would enqueue tracks the new
 * server can't stream. On invalidation the queue clears and the slice
 * starts empty for the new server.
 */

export interface PlaybackState {
  activeServerId: string | null;
  queueSongIds: string[];
  currentIndex: number;
  positionMs: number;
  repeatMode: RepeatModeState;
  shuffleMode: ShuffleMode;
  updatedAt: number;

  /**
   * Per-track resume positions. Written on the way out of a bookmarkable
   * track (long-form, podcast), read on song load. Cleared when a track
   * finishes (≥ 97% or explicit clear).
   *
   * `updatedAt` lets "Continue Playing" surfaces order by recency without
   * a second index — the map is small enough (dozens of entries at most,
   * since it only holds long-form) that a full sort is free.
   */
  bookmarks: Record<string, { positionMs: number; updatedAt: number }>;
}

const initialState: PlaybackState = {
  activeServerId: null,
  queueSongIds: [],
  currentIndex: 0,
  positionMs: 0,
  repeatMode: 'off',
  shuffleMode: 'off',
  updatedAt: 0,
  bookmarks: {},
};

const playbackSlice = createSlice({
  name: 'playback',
  initialState,
  reducers: {
    /** Full-queue write — used on any queue-changing action (play, playSongs,
     * playSongInCollection, autoplay-fill, smart-shuffle inject). */
    setPlaybackQueue(
      state,
      action: PayloadAction<{
        activeServerId: string | null;
        queueSongIds: string[];
        currentIndex: number;
        repeatMode: RepeatModeState;
        shuffleMode: ShuffleMode;
      }>
    ) {
      state.activeServerId = action.payload.activeServerId;
      state.queueSongIds = action.payload.queueSongIds;
      state.currentIndex = action.payload.currentIndex;
      state.repeatMode = action.payload.repeatMode;
      state.shuffleMode = action.payload.shuffleMode;
      state.positionMs = 0;
      state.updatedAt = Date.now();
    },

    /** Track-change write — same queue, just the pointer moves. */
    setPlaybackCurrentIndex(state, action: PayloadAction<{ currentIndex: number }>) {
      state.currentIndex = action.payload.currentIndex;
      state.positionMs = 0;
      state.updatedAt = Date.now();
    },

    /** Position tick — the hot path. Writes are debounced by the persister so
     * this doesn't hammer MMKV every render, but the shape is a simple set. */
    setPlaybackPosition(state, action: PayloadAction<{ positionMs: number }>) {
      state.positionMs = Math.max(0, Math.floor(action.payload.positionMs));
      state.updatedAt = Date.now();
    },

    setPlaybackRepeatMode(state, action: PayloadAction<RepeatModeState>) {
      state.repeatMode = action.payload;
      state.updatedAt = Date.now();
    },

    setPlaybackShuffleMode(state, action: PayloadAction<ShuffleMode>) {
      state.shuffleMode = action.payload;
      state.updatedAt = Date.now();
    },

    /**
     * Sets or clears a bookmark for a track. A zero (or a position past the
     * end-of-track cutoff the manager applies) clears it — the seek path
     * treats missing keys as "start from the top".
     */
    setPlaybackBookmark(
      state,
      action: PayloadAction<{ songId: string; positionMs: number | null }>
    ) {
      if (action.payload.positionMs === null || action.payload.positionMs <= 0) {
        delete state.bookmarks[action.payload.songId];
      } else {
        state.bookmarks[action.payload.songId] = {
          positionMs: Math.floor(action.payload.positionMs),
          updatedAt: Date.now(),
        };
      }
      state.updatedAt = Date.now();
    },

    /** Server-side seed — merges from Navidrome (getBookmarks) or Jellyfin
     * (Fields=UserData). Locally-written entries with a fresher updatedAt
     * win against a stale server seed. */
    seedPlaybackBookmarks(state, action: PayloadAction<Record<string, number>>) {
      const now = Date.now();
      for (const [songId, positionMs] of Object.entries(action.payload)) {
        const existing = state.bookmarks[songId];
        if (existing && existing.updatedAt > now - 60_000) continue;
        state.bookmarks[songId] = { positionMs, updatedAt: existing?.updatedAt ?? now - 60_000 };
      }
      state.updatedAt = now;
    },

    /** Server-switch invalidation. Called when the app notices the active
     * server changed under the persisted state. Bookmarks clear too — their
     * song ids belong to the old server's namespace. */
    resetPlaybackForServer(state, action: PayloadAction<{ activeServerId: string | null }>) {
      state.activeServerId = action.payload.activeServerId;
      state.queueSongIds = [];
      state.currentIndex = 0;
      state.positionMs = 0;
      state.repeatMode = 'off';
      state.shuffleMode = 'off';
      state.bookmarks = {};
      state.updatedAt = Date.now();
    },
  },
});

export const {
  setPlaybackQueue,
  setPlaybackCurrentIndex,
  setPlaybackPosition,
  setPlaybackRepeatMode,
  setPlaybackShuffleMode,
  setPlaybackBookmark,
  seedPlaybackBookmarks,
  resetPlaybackForServer,
} = playbackSlice.actions;

export default playbackSlice.reducer;
