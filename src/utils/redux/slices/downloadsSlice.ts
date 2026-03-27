import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { DownloadedTrackEntry, DownloadedCollectionEntry, PendingDownloadEntry } from '@/utils/downloads/downloadStore';

export interface DownloadsState {
  tracks: Record<string, DownloadedTrackEntry>;
  collections: Record<string, DownloadedCollectionEntry>;
  pending: Record<string, PendingDownloadEntry>;
}

const initialState: DownloadsState = {
  tracks: {},
  collections: {},
  pending: {},
};

const downloadsSlice = createSlice({
  name: 'downloads',
  initialState,
  reducers: {
    trackDownloaded(state, action: PayloadAction<DownloadedTrackEntry>) {
      state.tracks[action.payload.trackId] = action.payload;
    },
    trackRemoved(state, action: PayloadAction<string>) {
      delete state.tracks[action.payload];
    },
    staleTracksRemoved(state, action: PayloadAction<string[]>) {
      for (const id of action.payload) {
        delete state.tracks[id];
      }
    },
    collectionAdded(state, action: PayloadAction<DownloadedCollectionEntry>) {
      state.collections[action.payload.id] = action.payload;
    },
    collectionRemoved(state, action: PayloadAction<string>) {
      delete state.collections[action.payload];
    },
    collectionsUpdated(state, action: PayloadAction<Record<string, DownloadedCollectionEntry>>) {
      state.collections = action.payload;
    },
    pendingAdded(state, action: PayloadAction<{ id: string; entry: PendingDownloadEntry }>) {
      state.pending[action.payload.id] = action.payload.entry;
    },
    pendingRemoved(state, action: PayloadAction<string>) {
      delete state.pending[action.payload];
    },
    allCleared(state) {
      state.tracks = {};
      state.collections = {};
      state.pending = {};
    },
  },
});

export const {
  trackDownloaded,
  trackRemoved,
  staleTracksRemoved,
  collectionAdded,
  collectionRemoved,
  collectionsUpdated,
  pendingAdded,
  pendingRemoved,
  allCleared,
} = downloadsSlice.actions;

export default downloadsSlice.reducer;
