const API_VERSION = "1.16.0";
const CLIENT_NAME = "Yuzic";

export interface ScrobbleResult {
  success: boolean;
}

async function fetchScrobble(
  serverUrl: string,
  username: string,
  password: string,
  songId: string,
  isSubmission: boolean
) {
  const time = Date.now();

  const url =
    `${serverUrl}/rest/scrobble.view` +
    `?u=${encodeURIComponent(username)}` +
    `&p=${encodeURIComponent(password)}` +
    `&v=${API_VERSION}` +
    `&c=${CLIENT_NAME}` +
    `&f=json` +
    `&id=${encodeURIComponent(songId)}` +
    `&time=${time}` +
    `&submission=${isSubmission}`;

  const res = await fetch(url);
  return res.json();
}

function normalizeScrobble(raw: any): ScrobbleResult {
  const status = raw?.["subsonic-response"]?.status;
  return { success: status === "ok" };
}

export async function scrobbleTrack(
  serverUrl: string,
  username: string,
  password: string,
  songId: string,
  isSubmission: boolean = true
): Promise<ScrobbleResult> {
  const raw = await fetchScrobble(
    serverUrl,
    username,
    password,
    songId,
    isSubmission
  );
  return normalizeScrobble(raw);
}