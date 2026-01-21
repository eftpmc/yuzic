import { ListenBrainzConfig } from '@/types';
import { createListenBrainzClient } from '../client';

export const testConnection = async (
  config: ListenBrainzConfig
): Promise<{ success: boolean; message?: string }> => {
  try {
    const { request } = createListenBrainzClient(config);

    await request('/validate-token');

    return { success: true };
  } catch (error: any) {
    const message =
      typeof error?.message === 'string'
        ? error.message
        : 'Failed to connect to ListenBrainz';

    return {
      success: false,
      message,
    };
  }
};