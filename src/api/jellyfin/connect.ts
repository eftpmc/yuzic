import { setAuthenticated, setToken, setUserId } from "@/utils/redux/slices/serverSlice";
import store from "@/utils/redux/store";

export async function connect(
  serverUrl: string,
  username: string,
  password: string
): Promise<{ success: boolean; message?: string; token?: string; userId?: string }> {
  try {
    const res = await fetch(`${serverUrl}/Users/AuthenticateByName`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Emby-Authorization":
          `MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0"`
      },
      body: JSON.stringify({ Username: username, Pw: password })
    });

    if (!res.ok) {
      let msg = `Login failed (${res.status})`;

      if (res.status === 401) msg = "Invalid username or password.";
      if (res.status === 403)
        msg = "User is not permitted to sign in (check remote access settings).";

      return { success: false, message: msg };
    }

    const data = await res.json();
    const token = data?.AccessToken;
    const userId = data?.User?.Id;

    if (!token || !userId) {
      return { success: false, message: "Malformed Jellyfin login response." };
    }

    store.dispatch(setToken(token));
    store.dispatch(setUserId(userId));
    store.dispatch(setAuthenticated(true));

    return {
      success: true,
      token,
      userId
    };

  } catch {
    return { success: false, message: "Connection failed. Check URL or network." };
  }
}