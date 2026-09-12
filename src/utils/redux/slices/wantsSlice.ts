import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { LocalId } from '@/types/EntityId';
import type { ExternalIds } from '@/types/Album';

export type WantUnit = 'track' | 'album';

export type WantOrigin = 'search' | 'shelf' | 'artist-page' | 'manual';

/**
 * A saved intent to acquire a track or album. Stores enough (title/artist)
 * to render a wishlist row with zero lookups — per design, even a
 * 'manual' origin (nothing resolved on-device) saves title+artist locally.
 * `jobRef` is populated later (Phase C3/C4) when a Get is dispatched for
 * this want; the want only references the job, it never owns it.
 */
export interface Want {
  localId: LocalId;
  externalIds?: ExternalIds;
  unit: WantUnit;
  title: string;
  artist: string;
  origin: WantOrigin;
  jobRef?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WantsState {
  byServer: Record<string, Want[]>;
}

const initialState: WantsState = {
  byServer: {},
};

type ServerRef = { serverId: string };

/**
 * Save-only: no reducer performs or triggers acquisition; Get is a separate
 * action (Phase C3). These reducers only ever add/update/remove entries in
 * `byServer` — zero network calls, zero side effects.
 */
const wantsSlice = createSlice({
  name: 'wants',
  initialState,
  reducers: {
    addWant(state, action: PayloadAction<ServerRef & { want: Omit<Want, 'createdAt' | 'updatedAt'> }>) {
      const { serverId, want } = action.payload;
      const existing = state.byServer[serverId] ?? [];
      const now = Date.now();
      const index = existing.findIndex(w => w.localId === want.localId);
      if (index === -1) {
        state.byServer[serverId] = [...existing, { ...want, createdAt: now, updatedAt: now }];
      } else {
        const current = existing[index];
        const updated = [...existing];
        updated[index] = { ...current, ...want, createdAt: current.createdAt, updatedAt: now };
        state.byServer[serverId] = updated;
      }
    },
    removeWant(state, action: PayloadAction<ServerRef & { localId: LocalId }>) {
      const { serverId, localId } = action.payload;
      const existing = state.byServer[serverId];
      if (!existing) return;
      state.byServer[serverId] = existing.filter(w => w.localId !== localId);
    },
    setWantJobRef(state, action: PayloadAction<ServerRef & { localId: LocalId; jobRef: string | undefined }>) {
      const { serverId, localId, jobRef } = action.payload;
      const existing = state.byServer[serverId];
      if (!existing) return;
      const index = existing.findIndex(w => w.localId === localId);
      if (index === -1) return;
      const updated = [...existing];
      updated[index] = { ...updated[index], jobRef, updatedAt: Date.now() };
      state.byServer[serverId] = updated;
    },
    clearWantsForServer(state, action: PayloadAction<ServerRef>) {
      state.byServer[action.payload.serverId] = [];
    },
  },
});

export const {
  addWant,
  removeWant,
  setWantJobRef,
  clearWantsForServer,
} = wantsSlice.actions;

export default wantsSlice.reducer;
