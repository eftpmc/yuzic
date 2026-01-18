import { NavidromeConnectResult } from "@/api/types";

const API_VERSION = "1.16.0";
const CLIENT_NAME = "Yuzic";

export async function connect(
  serverUrl: string,
  username: string,
  password: string
): Promise<NavidromeConnectResult> {
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
      return { success: false, message: `Navidrome returned ${res.status}` };
    }

    const data = await res.json();
    const response = data["subsonic-response"];

    if (response?.status === "ok") {
      return { success: true };
    }

    return {
      success: false,
      message: response?.error?.message ?? "Navidrome authentication failed.",
    };
  } catch {
    return {
      success: false,
      message: "Failed to reach Navidrome server.",
    };
  }
}