import { setAuthenticated } from "@/utils/redux/slices/serverSlice";
import store from "@/utils/redux/store";

const API_VERSION = "1.16.0";
const CLIENT_NAME = "Yuzic";

export async function connect(
  serverUrl: string,
  username: string,
  password: string
): Promise<{ success: boolean; message?: string }> {
  console.log(serverUrl, username, password)
  if (!serverUrl || !username || !password) {
    return { success: false, message: "Missing credentials or server URL." };
  }

  const cleanUrl = serverUrl.replace(/\/+$/, "");

  const url =
    `${cleanUrl}/rest/getMusicFolders.view` +
    `?u=${encodeURIComponent(username)}` +
    `&p=${encodeURIComponent(password)}` +
    `&v=${API_VERSION}` +
    `&c=${CLIENT_NAME}` +
    `&f=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return {
        success: false,
        message: `Navidrome returned status ${res.status}`,
      };
    }

    let data: any = {};
    try {
      data = await res.json();
    } catch {
      return { success: false, message: "Navidrome returned invalid JSON." };
    }

    const response = data["subsonic-response"];
    if (!response) {
      return { success: false, message: "Malformed Subsonic response." };
    }

    // When credentials are correct
    if (response.status === "ok") {
      store.dispatch(setAuthenticated(true));
      return { success: true };
    }

    // When credentials fail
    if (response.error) {
      const msg =
        response.error.message ||
        response.error.code === 40
          ? "Invalid username or password."
          : "Navidrome authentication failed.";
      return { success: false, message: msg };
    }

    return {
      success: false,
      message: "Unknown Navidrome error occurred.",
    };
  } catch {
    return {
      success: false,
      message: "Failed to reach Navidrome server. Check URL or network.",
    };
  }
}