// utils/jellyfin/playlistApi.ts
import { PlaylistData, SongData } from '@/types';

const API_HEADERS = (token: string) => ({
  'X-Emby-Token': token,
  'Content-Type': 'application/json',
});

/**
 * Fetch all playlists for a Jellyfin user (including song IDs).
 */
export const fetchPlaylists = async (
  serverUrl: string,
  userId: string,
  token: string
): Promise<{
  id: string;
  name: string;
  entryIds: string[];
}[]> => {
  const listRes = await fetch(
    `${serverUrl}/Users/${userId}/Items?IncludeItemTypes=Playlist&Recursive=true&Fields=Id,Name`,
    { headers: API_HEADERS(token) }
  );
  if (!listRes.ok) throw new Error(`Failed to fetch playlists: ${listRes.statusText}`);

  const listJson = await listRes.json();
  const playlists = listJson.Items || [];
  
  const detailed = await Promise.all(
    playlists.map(async (pl: any) => {
      const itemsRes = await fetch(
        `${serverUrl}/Playlists/${pl.Id}/Items?userId=${userId}`,
        { headers: API_HEADERS(token) }
      );
      const itemsJson = await itemsRes.json();

      console.log(itemsJson.Items[0]);

      const entryIds = (itemsJson.Items || [])
        .map((it: any) => it.PlaylistItemId)   // <-- THIS IS THE ONLY CORRECT VALUE

        // filter out null entries (if any)
        .filter((x: any) => x);

      return { id: pl.Id, name: pl.Name, entryIds };
    })
  );

  return detailed;
};

/**
 * Create a new playlist.
 */
export const createPlaylistJellyfin = async (
  serverUrl: string,
  userId: string,
  token: string,
  name: string
): Promise<string> => {
  const res = await fetch(`${serverUrl}/Playlists`, {
    method: 'POST',
    headers: API_HEADERS(token),
    body: JSON.stringify({ Name: name, UserId: userId, MediaType: 'Audio' }),
  });
  if (!res.ok) throw new Error(`Failed to create playlist: ${res.statusText}`);
  const json = await res.json();
  return json.Id;
};

/**
 * Add items to a playlist.
 */
export const addItemsToPlaylistJellyfin = async (
  serverUrl: string,
  playlistId: string,
  userId: string,
  token: string,
  itemIds: string[]
): Promise<void> => {
  // Comma-separated list for query string
  const idsParam = itemIds.join(',');
  const url = `${serverUrl}/Playlists/${playlistId}/Items?Ids=${idsParam}&UserId=${userId}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: API_HEADERS(token),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to add items: ${res.status} ${res.statusText} ${text}`);
  }
};
/**
 * Remove items from a playlist.
 */
export const removeItemsFromPlaylistJellyfin = async (
  serverUrl: string,
  playlistId: string,
  token: string,
  entryIds: string[]
): Promise<void> => {
  const idsParam = entryIds.join(',');
  const url = `${serverUrl}/Playlists/${playlistId}/Items?EntryIds=${idsParam}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: API_HEADERS(token),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to remove items: ${res.status} ${res.statusText} ${text}`);
  }
};