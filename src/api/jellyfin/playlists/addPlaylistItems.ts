async function fetchAddPlaylistItems(
  serverUrl: string,
  playlistId: string,
  userId: string,
  token: string,
  itemIds: string[]
) {
  const ids = itemIds.join(",");
  const url =
    `${serverUrl}/Playlists/${playlistId}/Items` +
    `?Ids=${ids}&UserId=${userId}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Emby-Token": token,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) throw new Error(`Jellyfin addPlaylistItems failed: ${res.status}`);
}

function normalizeAddPlaylistItems() {
  return;
}

export async function addPlaylistItems(
  serverUrl: string,
  playlistId: string,
  userId: string,
  token: string,
  itemIds: string[]
): Promise<void> {
  await fetchAddPlaylistItems(serverUrl, playlistId, userId, token, itemIds);
  return normalizeAddPlaylistItems();
}