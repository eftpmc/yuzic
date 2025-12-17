const API_VERSION = "1.16.0";
const CLIENT_NAME = "Yuzic";

export interface RemoveSongFromPlaylistResult {
  success: boolean;
}

async function fetchRemoveSongFromPlaylist(
  serverUrl: string,
  username: string,
  password: string,
  playlistId: string,
  songIndex: string
) {
  const url =
    `${serverUrl}/rest/updatePlaylist.view` +
    `?u=${encodeURIComponent(username)}` +
    `&p=${encodeURIComponent(password)}` +
    `&v=${API_VERSION}` +
    `&c=${CLIENT_NAME}` +
    `&f=json` +
    `&playlistId=${encodeURIComponent(playlistId)}` +
    `&songIndexToRemove=${encodeURIComponent(songIndex)}`;

  const res = await fetch(url, { method: "POST" });
  return res.json();
}

export async function removeSongFromPlaylist(
  serverUrl: string,
  username: string,
  password: string,
  playlistId: string,
  songIndex: string
): Promise<RemoveSongFromPlaylistResult> {
  const raw = await fetchRemoveSongFromPlaylist(
    serverUrl,
    username,
    password,
    playlistId,
    songIndex
  );

  const status = raw?.["subsonic-response"]?.status;
  return { success: status === "ok" };
}