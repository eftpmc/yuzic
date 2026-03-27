type ConnectResult =
  | { success: true; token: string; userId: string }
  | { success: false; message?: string };

export async function connect(
  serverUrl: string,
  username: string,
  password: string,
  basicAuth?: { username: string; password: string }
): Promise<ConnectResult> {
  try {
    const res = await fetch(`${serverUrl}/Users/AuthenticateByName`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Emby-Authorization":
          `MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0"`,
        ...(basicAuth ? { Authorization: 'Basic ' + btoa(`${basicAuth.username}:${basicAuth.password}`) } : {}),
      },
      body: JSON.stringify({ Username: username, Pw: password }),
    });

    if (!res.ok) {
      let msg = `Login failed (${res.status})`;
      if (res.status === 401) msg = "Invalid username or password.";
      if (res.status === 403)
        msg = "User is not permitted to sign in.";
      return { success: false, message: msg };
    }

    const data = await res.json();
    const token = data?.AccessToken;
    const userId = data?.User?.Id;

    if (!token || !userId) {
      return {
        success: false,
        message: "Malformed Jellyfin login response.",
      };
    }

    return {
      success: true,
      token,
      userId,
    };
  } catch {
    return {
      success: false,
      message: "Connection failed. Check URL or network.",
    };
  }
}