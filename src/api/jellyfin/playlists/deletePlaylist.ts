export async function deletePlaylist(
  serverUrl: string,
  token: string,
  playlistId: string
): Promise<void> {
  const res = await fetch(`${serverUrl}/Playlists/${playlistId}`, {
    method: "DELETE",
    headers: {
      "X-Emby-Token": token,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Jellyfin deletePlaylist failed: ${res.status}`);
  }
}
