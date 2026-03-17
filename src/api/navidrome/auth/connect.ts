import { buildTokenParams } from "../client";

const API_VERSION = "1.16.0";
const CLIENT_NAME = "Yuzic";

type ConnectResult =
  | { success: true; libraries: { id: string; name: string }[] }
  | { success: false; message?: string };

export async function connect(
  serverUrl: string,
  username: string,
  password: string
): Promise<ConnectResult> {
  if (!serverUrl || !username || !password) {
    return { success: false, message: "Missing credentials or server URL." };
  }

  const cleanUrl = serverUrl.replace(/\/+$/, "");
  const { u, t, s } = buildTokenParams(username, password);
  const params = new URLSearchParams({
    u,
    t,
    s,
    v: API_VERSION,
    c: CLIENT_NAME,
    f: "json",
  });
  const url = `${cleanUrl}/rest/getMusicFolders.view?${params}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { success: false, message: `Navidrome returned ${res.status}` };
    }

    const data = await res.json();
    const response = data["subsonic-response"];

    if (response?.status === "ok") {
      const rawFolders = response?.musicFolders?.musicFolder;
      const folderList = Array.isArray(rawFolders)
        ? rawFolders
        : rawFolders
          ? [rawFolders]
          : [];

      const libraries = folderList
        .map((folder: any, index: number) => {
          const id = String(folder?.id ?? "").trim();
          const name = String(
            folder?.name ??
            folder?.title ??
            (id ? `Library ${index + 1}` : "")
          ).trim();
          if (!id) return null;
          return {
            id,
            name: name || `Library ${index + 1}`,
          };
        })
        .filter(Boolean) as { id: string; name: string }[];

      return { success: true, libraries };
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