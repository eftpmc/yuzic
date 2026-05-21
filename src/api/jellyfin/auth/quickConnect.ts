const CLIENT_HEADERS = `MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0"`;

export async function initiateQuickConnect(
  serverUrl: string,
  basicAuth?: { username: string; password: string }
): Promise<{ secret: string; code: string }> {
  const res = await fetch(`${serverUrl}/QuickConnect/Initiate`, {
    method: 'POST',
    headers: {
      'X-Emby-Authorization': CLIENT_HEADERS,
      ...(basicAuth ? { Authorization: 'Basic ' + btoa(`${basicAuth.username}:${basicAuth.password}`) } : {}),
    },
  });
  if (!res.ok) throw new Error(`Quick Connect not available on this server (${res.status})`);
  const data = await res.json();
  if (!data.Secret || !data.Code) throw new Error('Unexpected Quick Connect response');
  return { secret: data.Secret, code: data.Code };
}

export async function pollQuickConnect(
  serverUrl: string,
  secret: string,
  basicAuth?: { username: string; password: string }
): Promise<boolean> {
  try {
    const res = await fetch(`${serverUrl}/QuickConnect/Connect?Secret=${encodeURIComponent(secret)}`, {
      headers: {
        'X-Emby-Authorization': CLIENT_HEADERS,
        ...(basicAuth ? { Authorization: 'Basic ' + btoa(`${basicAuth.username}:${basicAuth.password}`) } : {}),
      },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.Authenticated === true;
  } catch {
    return false;
  }
}

export async function authenticateWithQuickConnect(
  serverUrl: string,
  secret: string,
  basicAuth?: { username: string; password: string }
): Promise<{ token: string; userId: string; username: string }> {
  const res = await fetch(`${serverUrl}/Users/AuthenticateWithQuickConnect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Emby-Authorization': CLIENT_HEADERS,
      ...(basicAuth ? { Authorization: 'Basic ' + btoa(`${basicAuth.username}:${basicAuth.password}`) } : {}),
    },
    body: JSON.stringify({ Secret: secret }),
  });
  if (!res.ok) throw new Error(`Quick Connect authentication failed (${res.status})`);
  const data = await res.json();
  const token = data?.AccessToken;
  const userId = data?.User?.Id;
  const username = data?.User?.Name ?? '';
  if (!token || !userId) throw new Error('Malformed Quick Connect response');
  return { token, userId, username };
}
