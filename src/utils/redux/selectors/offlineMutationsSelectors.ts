import { RootState } from '@/utils/redux/store';

export const selectOfflineMutationQueue = (state: RootState) => state.offlineMutations.queue;
