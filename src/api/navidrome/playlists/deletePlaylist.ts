const API_VERSION = "1.16.0";
const CLIENT_NAME = "Yuzic";

async function fetchDeletePlaylist(
  serverUrl: string,
  username: string,
  password: string,
  playlistId: string
) {
  const url =
    `${serverUrl}/rest/deletePlaylist.view` +
    `?u=${encodeURIComponent(username)}` +
    `&p=${encodeURIComponent(password)}` +
    `&v=${API_VERSION}` +
    `&c=${CLIENT_NAME}` +
    `&f=json` +
    `&id=${encodeURIComponent(playlistId)}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to delete playlist: ${res.status} ${res.statusText}`);
  }

  const raw = await res.json();
  const status = raw?.["subsonic-response"]?.status;
  if (status !== "ok") {
    throw new Error("Failed to delete playlist");
  }
}

export async function deletePlaylist(
  serverUrl: string,
  username: string,
  password: string,
  playlistId: string
): Promise<void> {
  await fetchDeletePlaylist(serverUrl, username, password, playlistId);
}
