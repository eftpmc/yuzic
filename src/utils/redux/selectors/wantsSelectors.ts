import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@/utils/redux/store';
import type { LocalId } from '@/types/EntityId';
import type { Want } from '@/utils/redux/slices/wantsSlice';

const EMPTY_WANTS: Want[] = [];

export const selectWantsForActiveServer = createSelector(
  [(s: RootState) => s.wants.byServer, (s: RootState) => s.servers.activeServerId],
  (byServer, activeServerId): Want[] =>
    (activeServerId ? byServer[activeServerId] ?? EMPTY_WANTS : EMPTY_WANTS)
);

export const selectWantCountForActiveServer = createSelector(
  [selectWantsForActiveServer],
  (wants): number => wants.length
);

/**
 * Curried selector: `selectIsWanted(localId)(state)`. Matches the repo's
 * `createSelector`-based factory pattern used for per-id lookups.
 */
export const selectIsWanted = (localId: LocalId) =>
  createSelector(
    [selectWantsForActiveServer],
    (wants): boolean => wants.some(w => w.localId === localId)
  );
