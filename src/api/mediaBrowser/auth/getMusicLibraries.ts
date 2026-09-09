import { Server } from '@/types';
import { MediaBrowserItemsResponse } from '../types';
import { serverFetch } from '@/features/mtls/serverFetch';

export async function getMusicLibraries(server: Server): Promise<{ id: string; name: string }[]> {
  const { serverUrl, auth } = server;
  const token = auth?.token as string | undefined;
  const userId = auth?.userId as string | undefined;
  if (!serverUrl || !token || !userId) return [];

  try {
    const res = await serverFetch(`${serverUrl}/Users/${encodeURIComponent(userId)}/Views`, {
      headers: { 'X-Emby-Token': token },
    });
    // A refused or errored response is not a server without music. Returning
    // an empty list here rendered a bad token, an expired session and an
    // unreachable host all as "this server has no music libraries" — during
    // setup, which is the worst possible place to be wrong about it.
    if (!res.ok) {
      throw new Error(`getMusicLibraries failed: HTTP ${res.status}`);
    }
    const data: MediaBrowserItemsResponse = await res.json();
    const items = data?.Items ?? [];
    return items
      .filter((i) => i.CollectionType === 'music')
      .map((i) => ({ id: String(i.Id), name: String(i.Name) }));
  } catch (error) {
    console.error('Jellyfin/Emby getMusicLibraries failed:', error);
    throw error;
  }
}
