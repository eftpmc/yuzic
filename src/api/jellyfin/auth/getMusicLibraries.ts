import { Server } from '@/types';

export async function getMusicLibraries(server: Server): Promise<{ id: string; name: string }[]> {
  const { serverUrl, auth } = server;
  const token = auth?.token as string | undefined;
  const userId = auth?.userId as string | undefined;
  if (!serverUrl || !token || !userId) return [];

  try {
    const res = await fetch(`${serverUrl}/Users/${encodeURIComponent(userId)}/Views`, {
      headers: { 'X-Emby-Token': token },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items: any[] = data?.Items ?? [];
    return items
      .filter((i) => i.CollectionType === 'music')
      .map((i) => ({ id: String(i.Id), name: String(i.Name) }));
  } catch {
    return [];
  }
}
