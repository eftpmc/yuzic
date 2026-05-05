import { RootState } from '@/utils/redux/store';

export const selectOfflineMutationQueue = (state: RootState) => state.offlineMutations.queue;

export const selectOfflineMutationCount = (state: RootState) =>
  state.offlineMutations.queue.length;

export const selectFailedOfflineMutationCount = (state: RootState) =>
  state.offlineMutations.queue.filter(item => item.lastError).length;
