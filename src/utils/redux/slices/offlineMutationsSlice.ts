import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  enqueueOfflineMutation,
  OfflineMutation,
} from '@/utils/offline/offlineMutations';

interface OfflineMutationsState {
  queue: OfflineMutation[];
}

const initialState: OfflineMutationsState = {
  queue: [],
};

const offlineMutationsSlice = createSlice({
  name: 'offlineMutations',
  initialState,
  reducers: {
    enqueueOfflineMutationAction(state, action: PayloadAction<OfflineMutation>) {
      state.queue = enqueueOfflineMutation(state.queue, action.payload);
    },
    removeOfflineMutation(state, action: PayloadAction<string>) {
      state.queue = state.queue.filter(item => item.id !== action.payload);
    },
    markOfflineMutationFailed(
      state,
      action: PayloadAction<{
        id: string;
        error: string;
        failedAt: number;
        nextRetryAt: number;
      }>
    ) {
      const mutation = state.queue.find(item => item.id === action.payload.id);
      if (!mutation) return;

      mutation.retryCount = (mutation.retryCount ?? 0) + 1;
      mutation.lastError = action.payload.error;
      mutation.lastFailedAt = action.payload.failedAt;
      mutation.nextRetryAt = action.payload.nextRetryAt;
    },
    retryOfflineMutationsForServer(state, action: PayloadAction<string>) {
      state.queue.forEach(item => {
        if (item.serverId !== action.payload) return;

        delete item.lastError;
        delete item.lastFailedAt;
        delete item.nextRetryAt;
      });
    },
    clearOfflineMutationsForServer(state, action: PayloadAction<string>) {
      state.queue = state.queue.filter(item => item.serverId !== action.payload);
    },
  },
});

export const {
  enqueueOfflineMutationAction,
  removeOfflineMutation,
  markOfflineMutationFailed,
  retryOfflineMutationsForServer,
  clearOfflineMutationsForServer,
} = offlineMutationsSlice.actions;

export default offlineMutationsSlice.reducer;
