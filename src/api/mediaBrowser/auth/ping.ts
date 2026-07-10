import type { MediaBrowserClient } from "../client";

export async function ping(client: MediaBrowserClient): Promise<boolean> {
  try {
    if (client.brand.pingAsText) {
      await client.requestText("/System/Ping", { tokenOnly: true });
    } else {
      await client.request("/System/Ping", { tokenOnly: true });
    }
    return true;
  } catch {
    return false;
  }
}
